// Убирает светлый фон у сгенерированного спрайта: заливка от краёв по «почти белому/серому».
// Использование: swift cutout.swift in.webp out.png [W H]   (W H — размер кадра; объект вписывается с полем 6%)
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count >= 3, let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("cannot read \(a.count > 1 ? a[1] : "")"); exit(1) }
let w = img.width, h = img.height
var px = [UInt8](repeating: 0, count: w * h * 4)
let cs = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

// фон = светлый и малонасыщенный (белый, серая тень, линии чертежа вне объекта)
func isBg(_ i: Int) -> Bool {
    let r = Int(px[i]), g = Int(px[i+1]), b = Int(px[i+2])
    let mx = max(r, g, b), mn = min(r, g, b)
    return mx > 150 && (mx - mn) < 38
}
var bg = [Bool](repeating: false, count: w * h)
var stack: [Int] = []
func push(_ x: Int, _ y: Int) {
    let p = y * w + x
    if !bg[p] && isBg(p * 4) { bg[p] = true; stack.append(p) }
}
for x in 0..<w { push(x, 0); push(x, h - 1) }
for y in 0..<h { push(0, y); push(w - 1, y) }
while let p = stack.popLast() {
    let x = p % w, y = p / w
    if x > 0 { push(x - 1, y) }; if x < w - 1 { push(x + 1, y) }
    if y > 0 { push(x, y - 1) }; if y < h - 1 { push(x, y + 1) }
}
// белые «дырки» внутри (гнездо ступицы, просвет): крупные почти чисто белые области, не связанные с краем
var seen = [Bool](repeating: false, count: w * h)
for s0 in 0..<(w * h) where !bg[s0] && !seen[s0] {
    let i0 = s0 * 4
    if !(px[i0] > 238 && px[i0+1] > 238 && px[i0+2] > 238) { continue }
    var comp = [s0]; seen[s0] = true; var k = 0
    while k < comp.count {
        let p = comp[k]; k += 1
        let x = p % w, y = p / w
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)] {
            let nx = x + dx, ny = y + dy
            if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
            let q = ny * w + nx
            if seen[q] || bg[q] { continue }
            let j = q * 4
            if px[j] > 238 && px[j+1] > 238 && px[j+2] > 238 { seen[q] = true; comp.append(q) }
        }
    }
    if comp.count > w * h / 500 { for p in comp { bg[p] = true } }
}
// bbox объекта и лёгкое сглаживание края (1px)
var x0 = w, y0 = h, x1 = 0, y1 = 0
for y in 0..<h { for x in 0..<w {
    let p = y * w + x
    if bg[p] { px[p*4+3] = 0; px[p*4] = 0; px[p*4+1] = 0; px[p*4+2] = 0 }
    else { x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y) }
} }
// убрать одиночные «острова» линий чертежа: оставляем только крупнейшую связную область
var label = [Int32](repeating: 0, count: w * h)
var sizes: [Int32: Int] = [:]
var next: Int32 = 1
for s in 0..<(w*h) where px[s*4+3] != 0 && label[s] == 0 {
    var st = [s]; label[s] = next; var n = 0
    while let p = st.popLast() {
        n += 1; let x = p % w, y = p / w
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)] {
            let nx = x + dx, ny = y + dy
            if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
            let q = ny * w + nx
            if px[q*4+3] != 0 && label[q] == 0 { label[q] = next; st.append(q) }
        }
    }
    sizes[next] = n; next += 1
}
let keep = sizes.max { $0.value < $1.value }!.key
x0 = w; y0 = h; x1 = 0; y1 = 0
for p in 0..<(w*h) {
    if label[p] != keep && px[p*4+3] != 0 { px[p*4+3] = 0; px[p*4] = 0; px[p*4+1] = 0; px[p*4+2] = 0 }
    if px[p*4+3] != 0 { let x = p % w, y = p / w; x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y) }
}
// --- снятие светлой каёмки: внешние 2 px маски перекрашиваются цветом ближайшей «сердцевины», край делается мягким
do {
    var d = [UInt8](repeating: 0, count: w * h)       // 0 — фон, 1 — крайний пиксель, 2 — второй от края, 255 — сердцевина
    for p in 0..<(w*h) where px[p*4+3] != 0 { d[p] = 255 }
    func nb(_ p: Int, _ f: (Int) -> Bool) -> Bool {
        let x = p % w, y = p / w
        if x > 0 && f(p - 1) { return true }; if x < w - 1 && f(p + 1) { return true }
        if y > 0 && f(p - w) { return true }; if y < h - 1 && f(p + w) { return true }
        return false
    }
    for p in 0..<(w*h) where d[p] == 255 {
        let x = p % w, y = p / w
        if x == 0 || y == 0 || x == w - 1 || y == h - 1 || nb(p, { d[$0] == 0 }) { d[p] = 1 }
    }
    for p in 0..<(w*h) where d[p] == 255 { if nb(p, { d[$0] == 1 }) { d[p] = 2 } }
    var rgb = px
    for p in 0..<(w*h) where d[p] == 1 || d[p] == 2 {
        let x = p % w, y = p / w
        var r = 0, g = 0, b = 0, n = 0
        for dy in -4...4 { for dx in -4...4 {
            let nx = x + dx, ny = y + dy
            if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
            let q = ny * w + nx
            if d[q] == 255 { r += Int(px[q*4]); g += Int(px[q*4+1]); b += Int(px[q*4+2]); n += 1 }
        } }
        if n > 0 {
            rgb[p*4] = UInt8(r / n); rgb[p*4+1] = UInt8(g / n); rgb[p*4+2] = UInt8(b / n)
        }
        let al: Int = d[p] == 1 ? 120 : 225
        rgb[p*4+3] = UInt8(al)
        // premultiplied alpha
        rgb[p*4] = UInt8(Int(rgb[p*4]) * al / 255); rgb[p*4+1] = UInt8(Int(rgb[p*4+1]) * al / 255); rgb[p*4+2] = UInt8(Int(rgb[p*4+2]) * al / 255)
    }
    px = rgb
}
let full = ctx.makeImage()!
let cw = x1 - x0 + 1, ch = y1 - y0 + 1
let crop = full.cropping(to: CGRect(x: x0, y: y0, width: cw, height: ch))!

// вписать в кадр W×H с полем 6%
let outW = a.count >= 5 ? Int(a[3])! : cw, outH = a.count >= 5 ? Int(a[4])! : ch
let o = CGContext(data: nil, width: outW, height: outH, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
o.interpolationQuality = .high
let pad = a.count >= 5 ? 0.06 : 0.0
if a.count >= 6 && a[5] == "pivot" {
    // голова башни: ось вращения = центр кадра. Ось — центр самого «толстого» круга (макс. расстояние до края маски).
    let st = max(1, max(w, h) / 400), gw = w / st, gh = h / st
    var m = [Bool](repeating: false, count: gw * gh)
    for gy in 0..<gh { for gx in 0..<gw { m[gy*gw+gx] = px[((gy*st)*w + gx*st)*4+3] != 0 } }
    var d = [Float](repeating: 0, count: gw * gh)
    let big: Float = 1e9
    for i in 0..<(gw*gh) { d[i] = m[i] ? big : 0 }
    for gy in 0..<gh { for gx in 0..<gw where m[gy*gw+gx] {   // прямой проход (хэмфер 3-4)
        var v = d[gy*gw+gx]
        if gx > 0 { v = min(v, d[gy*gw+gx-1] + 1) }; if gy > 0 { v = min(v, d[(gy-1)*gw+gx] + 1) }
        if gx > 0 && gy > 0 { v = min(v, d[(gy-1)*gw+gx-1] + 1.414) }
        if gx < gw-1 && gy > 0 { v = min(v, d[(gy-1)*gw+gx+1] + 1.414) }
        d[gy*gw+gx] = v } }
    for gy in stride(from: gh-1, through: 0, by: -1) { for gx in stride(from: gw-1, through: 0, by: -1) where m[gy*gw+gx] {
        var v = d[gy*gw+gx]
        if gx < gw-1 { v = min(v, d[gy*gw+gx+1] + 1) }; if gy < gh-1 { v = min(v, d[(gy+1)*gw+gx] + 1) }
        if gx < gw-1 && gy < gh-1 { v = min(v, d[(gy+1)*gw+gx+1] + 1.414) }
        if gx > 0 && gy < gh-1 { v = min(v, d[(gy+1)*gw+gx-1] + 1.414) }
        d[gy*gw+gx] = v } }
    var mx: Float = 0
    for i in 0..<(gw*gh) where m[i] && d[i] < big { mx = max(mx, d[i]) }
    var sx = 0.0, sy = 0.0, sn = 0.0
    for gy in 0..<gh { for gx in 0..<gw where m[gy*gw+gx] && d[gy*gw+gx] >= mx * 0.9 { sx += Double(gx); sy += Double(gy); sn += 1 } }
    let pxc = (sx / sn + 0.5) * Double(st), pyc = (sy / sn + 0.5) * Double(st)
    let el = pxc - Double(x0), er = Double(x1) - pxc, et = pyc - Double(y0), eb = Double(y1) - pyc
    let hx = max(el, er), hy = max(et, eb)
    let sc = min(Double(outW) * (0.5 - 0.02) / hx, Double(outH) * (0.5 - 0.02) / hy)
    o.draw(full, in: CGRect(x: Double(outW)/2 - pxc*sc, y: Double(outH)/2 - (Double(h) - pyc)*sc, width: Double(w)*sc, height: Double(h)*sc))
    print("pivot \(Int(pxc)),\(Int(pyc)) of \(w)x\(h), bbox \(x0),\(y0)-\(x1),\(y1)")
} else {
    let s = min(Double(outW) * (1 - 2*pad) / Double(cw), Double(outH) * (1 - 2*pad) / Double(ch))
    let dw = Double(cw) * s, dh = Double(ch) * s
    o.draw(crop, in: CGRect(x: (Double(outW) - dw) / 2, y: (Double(outH) - dh) / 2, width: dw, height: dh))
}
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, o.makeImage()!, nil)
CGImageDestinationFinalize(dest)
print("ok \(a[2]) \(outW)x\(outH) obj \(cw)x\(ch)")
