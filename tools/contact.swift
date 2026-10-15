// Контактный лист: swift contact.swift out.png cols cell in1 in2 ...  (плитки по порядку аргументов, номер в углу)
import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
let cols = Int(a[2])!, cell = Int(a[3])!
let files = Array(a[4...])
let rows = (files.count + cols - 1) / cols
let cs = CGColorSpaceCreateDeviceRGB()
let ctx = CGContext(data: nil, width: cols * cell, height: rows * cell, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.setFillColor(CGColor(red: 0.2, green: 0.2, blue: 0.2, alpha: 1)); ctx.fill(CGRect(x: 0, y: 0, width: cols * cell, height: rows * cell))
for (i, f) in files.enumerated() {
    guard let s = CGImageSourceCreateWithURL(URL(fileURLWithPath: f) as CFURL, nil),
          let im = CGImageSourceCreateImageAtIndex(s, 0, nil) else { continue }
    let c = i % cols, r = rows - 1 - i / cols
    let k = min(Double(cell - 8) / Double(im.width), Double(cell - 8) / Double(im.height))
    let w = Double(im.width) * k, h = Double(im.height) * k
    ctx.draw(im, in: CGRect(x: Double(c * cell) + (Double(cell) - w) / 2, y: Double(r * cell) + (Double(cell) - h) / 2, width: w, height: h))
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: "\(i + 1)", attributes: [
        NSAttributedString.Key(kCTFontAttributeName as String): CTFontCreateWithName("Helvetica-Bold" as CFString, 28, nil),
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(red: 1, green: 0, blue: 0, alpha: 1)]))
    ctx.textPosition = CGPoint(x: Double(c * cell) + 8, y: Double(r * cell) + Double(cell) - 34)
    CTLineDraw(line, ctx)
}
let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(d, ctx.makeImage()!, nil); CGImageDestinationFinalize(d)
print("ok", files.count)
