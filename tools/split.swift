// Нарезает лист предметов (белый фон) на отдельные PNG с прозрачностью.
// swift split.swift sheet.png outdir prefix maxSide [dilate] [minArea]
// Объекты, расположенные ближе dilate px, склеиваются (россыпь камешков остаётся одним предметом).
// Нумерация: по рядам сверху вниз, внутри ряда слева направо.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count >= 5, let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("usage"); exit(1) }
let outDir = a[2], prefix = a[3], maxSide = Double(a[4])!
let dil = a.count > 5 ? Int(a[5])! : 36
let w = img.width, h = img.height
var minArea = a.count > 6 ? Int(a[6])! : 6000
var px = [UInt8](repeating: 0, count: w * h * 4)
let cs = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

// фон: почти чисто белый, связанный с краем
func isBg(_ p: Int) -> Bool {
    let r = Int(px[p*4]), g = Int(px[p*4+1]), b = Int(px[p*4+2])
    return min(r, g, b) > 234 && max(r, g, b) - min(r, g, b) < 18
}
var bg = [Bool](repeating: false, count: w * h)
var st: [Int] = []
func push(_ x: Int, _ y: Int) { let p = y * w + x; if !bg[p] && isBg(p) { bg[p] = true; st.append(p) } }
for x in 0..<w { push(x, 0); push(x, h - 1) }
for y in 0..<h { push(0, y); push(w - 1, y) }
while let p = st.popLast() {
    let x = p % w, y = p / w
    if x > 0 { push(x - 1, y) }; if x < w - 1 { push(x + 1, y) }
    if y > 0 { push(x, y - 1) }; if y < h - 1 { push(x, y + 1) }
}
// внутренние белые карманы (просветы в кусте, шинах): достаточно крупные почти белые области тоже считаем фоном
do {
    var seen = [Bool](repeating: false, count: w * h)
    for s0 in 0..<(w*h) where !bg[s0] && !seen[s0] && isBg(s0) {
        var comp = [s0]; seen[s0] = true; var k = 0
        while k < comp.count {
            let p = comp[k]; k += 1
            let x = p % w, y = p / w
            for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)] {
                let nx = x + dx, ny = y + dy
                if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
                let q = ny * w + nx
                if !seen[q] && !bg[q] && isBg(q) { seen[q] = true; comp.append(q) }
            }
        }
        if comp.count >= 120 { for p in comp { bg[p] = true } }
    }
}
// внутренние белые карманы (не связанные с краем) остаются частью предмета
var m = [Bool](repeating: false, count: w * h)
for p in 0..<(w*h) { m[p] = !bg[p] }
// эрозия на 1 px: убирает светлую кромку
var er = m
for p in 0..<(w*h) where m[p] {
    let x = p % w, y = p / w
    if x == 0 || y == 0 || x == w - 1 || y == h - 1 || !m[p-1] || !m[p+1] || !m[p-w] || !m[p+w] { er[p] = false }
}
// дилатация (разделимая) для склейки близких фрагментов
func dilate(_ s: [Bool], _ r: Int) -> [Bool] {
    var tmp = [Bool](repeating: false, count: w * h), out = tmp
    for y in 0..<h {
        var run = -1000000
        for x in 0..<w { if s[y*w+x] { run = x }; if x - run <= r { tmp[y*w+x] = true } }
        run = 1000000
        for x in stride(from: w - 1, through: 0, by: -1) { if s[y*w+x] { run = x }; if run - x <= r { tmp[y*w+x] = true } }
    }
    for x in 0..<w {
        var run = -1000000
        for y in 0..<h { if tmp[y*w+x] { run = y }; if y - run <= r { out[y*w+x] = true } }
        run = 1000000
        for y in stride(from: h - 1, through: 0, by: -1) { if tmp[y*w+x] { run = y }; if run - y <= r { out[y*w+x] = true } }
    }
    return out
}
let dm = dilate(er, dil)
var label = [Int32](repeating: 0, count: w * h)
struct Box { var x0 = Int.max, y0 = Int.max, x1 = 0, y1 = 0, n = 0 }
var boxes: [Box] = []
var next: Int32 = 1
for s in 0..<(w*h) where dm[s] && label[s] == 0 {
    var stack = [s]; label[s] = next; var b = Box()
    while let p = stack.popLast() {
        let x = p % w, y = p / w
        if er[p] { b.x0 = min(b.x0, x); b.x1 = max(b.x1, x); b.y0 = min(b.y0, y); b.y1 = max(b.y1, y); b.n += 1 }
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)] {
            let nx = x + dx, ny = y + dy
            if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
            let q = ny * w + nx
            if dm[q] && label[q] == 0 { label[q] = next; stack.append(q) }
        }
    }
    boxes.append(b); next += 1
}
var items: [(Int32, Box)] = []
for (i, b) in boxes.enumerated() where b.n >= minArea { items.append((Int32(i + 1), b)) }
// порядок чтения: ряды по центру Y (допуск 12% высоты), затем X
let rowTol = h / 8
items.sort { (p, q) in
    let cy1 = (p.1.y0 + p.1.y1) / 2, cy2 = (q.1.y0 + q.1.y1) / 2
    if abs(cy1 - cy2) > rowTol { return cy1 < cy2 }
    return p.1.x0 < q.1.x0
}
try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
for (idx, it) in items.enumerated() {
    let (lab, b) = it
    let pad = 6
    let x0 = max(0, b.x0 - pad), y0 = max(0, b.y0 - pad), x1 = min(w - 1, b.x1 + pad), y1 = min(h - 1, b.y1 + pad)
    let cw = x1 - x0 + 1, ch = y1 - y0 + 1
    var buf = [UInt8](repeating: 0, count: cw * ch * 4)
    for y in 0..<ch { for x in 0..<cw {
        let p = (y + y0) * w + (x + x0), o = (y * cw + x) * 4
        if label[p] == lab && er[p] {
            let edge = !er[p-1] || !er[p+1] || !er[p-w] || !er[p+w]
            let al = edge ? 170 : 255
            buf[o] = UInt8(Int(px[p*4]) * al / 255); buf[o+1] = UInt8(Int(px[p*4+1]) * al / 255)
            buf[o+2] = UInt8(Int(px[p*4+2]) * al / 255); buf[o+3] = UInt8(al)
        }
    } }
    let sc = min(1.0, maxSide / Double(max(cw, ch)))
    let ow = max(1, Int((Double(cw) * sc).rounded())), oh = max(1, Int((Double(ch) * sc).rounded()))
    let c1 = buf.withUnsafeMutableBytes { CGContext(data: $0.baseAddress, width: cw, height: ch, bitsPerComponent: 8, bytesPerRow: cw * 4, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)! }
    let src2 = c1.makeImage()!
    let c2 = CGContext(data: nil, width: ow, height: oh, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    c2.interpolationQuality = .high
    c2.draw(src2, in: CGRect(x: 0, y: 0, width: ow, height: oh))
    let path = String(format: "%@/%@_%d.png", outDir, prefix, idx + 1)
    let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(d, c2.makeImage()!, nil); CGImageDestinationFinalize(d)
    print("\(idx + 1): \(ow)x\(oh) src \(cw)x\(ch) n=\(b.n)")
}
