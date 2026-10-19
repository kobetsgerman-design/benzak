// Находит колёса на спрайте техники (тёмные вытянутые пятна) и печатает прямоугольники в долях кадра.
// swift wheels.swift sprite.png [debug.png]  → JSON [[x,y,w,h],...], x/y/w/h в долях ширины/высоты спрайта.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { print("[]"); exit(1) }
let w = img.width, h = img.height
var px = [UInt8](repeating: 0, count: w * h * 4)
let cs = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: cs,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))

func dark(_ p: Int) -> Bool {
    let al = Int(px[p*4+3]); if al < 200 { return false }
    let l = (Int(px[p*4]) * 3 + Int(px[p*4+1]) * 6 + Int(px[p*4+2])) / 10
    return l < 46
}
var seen = [Bool](repeating: false, count: w * h)
var opaque = 0
for p in 0..<(w*h) where px[p*4+3] > 200 { opaque += 1 }
var boxes: [(Int, Int, Int, Int, Int)] = []
for s in 0..<(w*h) where !seen[s] && dark(s) {
    var st = [s]; seen[s] = true
    var x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0
    while let p = st.popLast() {
        n += 1; let x = p % w, y = p / w
        x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y)
        for (dx, dy) in [(-1,0),(1,0),(0,-1),(0,1)] {
            let nx = x + dx, ny = y + dy
            if nx < 0 || ny < 0 || nx >= w || ny >= h { continue }
            let q = ny * w + nx
            if !seen[q] && dark(q) { seen[q] = true; st.append(q) }
        }
    }
    let bw = x1 - x0 + 1, bh = y1 - y0 + 1
    let fill = Double(n) / Double(bw * bh)
    // колесо: достаточно крупное, вытянутое вдоль оси X (техника смотрит вправо), плотно заполненный прямоугольник
    if n > opaque / 400 && Double(bw) / Double(bh) >= 1.25 && fill > 0.55 && bw > w / 14 { boxes.append((x0, y0, bw, bh, n)) }
}
boxes.sort { $0.1 < $1.1 || ($0.1 == $1.1 && $0.0 < $1.0) }
let out = boxes.map { b in String(format: "[%.4f,%.4f,%.4f,%.4f]", Double(b.0)/Double(w), Double(b.1)/Double(h), Double(b.2)/Double(w), Double(b.3)/Double(h)) }
print("[" + out.joined(separator: ",") + "]")

if a.count > 2 {   // отладочная картинка с рамками
    ctx.setStrokeColor(CGColor(red: 0, green: 1, blue: 0, alpha: 1)); ctx.setLineWidth(2)
    for b in boxes { ctx.stroke(CGRect(x: b.0, y: h - b.1 - b.3, width: b.2, height: b.3)) }
    let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(d, ctx.makeImage()!, nil); CGImageDestinationFinalize(d)
}
