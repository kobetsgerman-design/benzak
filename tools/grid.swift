// Увеличивает спрайт и рисует сетку по 10% с подписями — для ручной разметки (колёса, точки крепления).
// swift grid.swift in.png out.png [scale]
import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil),
      let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { exit(1) }
let sc = a.count > 3 ? Double(a[3])! : 3
let W = Int(Double(img.width) * sc), H = Int(Double(img.height) * sc)
let cs = CGColorSpaceCreateDeviceRGB()
let g = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
g.setFillColor(CGColor(red: 0.5, green: 0.5, blue: 0.55, alpha: 1)); g.fill(CGRect(x: 0, y: 0, width: W, height: H))
g.interpolationQuality = .high
g.draw(img, in: CGRect(x: 0, y: 0, width: W, height: H))
for i in 0...10 {
    let f = Double(i) / 10
    g.setStrokeColor(CGColor(red: 0, green: 1, blue: 1, alpha: i % 5 == 0 ? 0.9 : 0.45)); g.setLineWidth(i % 5 == 0 ? 2 : 1)
    g.move(to: CGPoint(x: f * Double(W), y: 0)); g.addLine(to: CGPoint(x: f * Double(W), y: Double(H))); g.strokePath()
    g.move(to: CGPoint(x: 0, y: (1 - f) * Double(H))); g.addLine(to: CGPoint(x: Double(W), y: (1 - f) * Double(H))); g.strokePath()
    for (txt, x, y) in [("\(i*10)", f * Double(W) + 2, Double(H) - 14), ("\(i*10)", 2.0, (1 - f) * Double(H) + 2)] {
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: txt, attributes: [
            NSAttributedString.Key(kCTFontAttributeName as String): CTFontCreateWithName("Helvetica-Bold" as CFString, 13, nil),
            NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(red: 1, green: 1, blue: 0, alpha: 1)]))
        g.textPosition = CGPoint(x: x, y: y); CTLineDraw(line, g)
    }
}
let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(d, g.makeImage()!, nil); CGImageDestinationFinalize(d)
