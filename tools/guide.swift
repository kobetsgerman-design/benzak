// Направляющая картинка карты для перекраски нейросетью: дорога, площадки, выход.
// swift guide.swift out.png "x,y;x,y;..." (путь, клетки) "x,y;..." (слоты) тема(sand|dune|city)
// Размер 1536×2304 (2:3): клетка 256×230.4; после перекраски растягивается до 1536×2560 (3:5) → клетка 256×256.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
func pts(_ s: String) -> [(Int, Int)] {
    s.split(separator: ";").map { p in let v = p.split(separator: ",").map { Int($0)! }; return (v[0], v[1]) }
}
let wp = pts(a[2]), slots = pts(a[3]), theme = a.count > 4 ? a[4] : "sand"
let W = 1536, H = 2304, cw = Double(W) / 6, ch = Double(H) / 10
let cs = CGColorSpaceCreateDeviceRGB()
let g = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
func col(_ r: Int, _ gg: Int, _ b: Int, _ al: Double = 1) -> CGColor { CGColor(red: Double(r)/255, green: Double(gg)/255, blue: Double(b)/255, alpha: al) }
// координаты: верх картинки = ряд 0
func cx(_ c: Int) -> Double { (Double(c) + 0.5) * cw }
func cy(_ r: Int) -> Double { Double(H) - (Double(r) + 0.5) * ch }

let ground: CGColor, road: CGColor, pad: CGColor
switch theme {
case "dune": ground = col(232, 205, 150); road = col(70, 62, 58); pad = col(214, 188, 134)
case "city": ground = col(150, 150, 146); road = col(52, 52, 56); pad = col(176, 176, 172)
default:     ground = col(208, 176, 120); road = col(60, 52, 46); pad = col(190, 160, 108)
}
g.setFillColor(ground); g.fill(CGRect(x: 0, y: 0, width: W, height: H))
// площадки под башни — ровные спокойные квадраты
for s in slots {
    g.setFillColor(pad)
    g.fill(CGRect(x: cx(s.0) - cw*0.45, y: cy(s.1) - ch*0.45, width: cw*0.9, height: ch*0.9))
}
// дорога
g.setLineJoin(.round); g.setLineCap(.round)
func path() { g.beginPath(); for (i, p) in wp.enumerated() { let pt = CGPoint(x: cx(p.0), y: cy(p.1)); i == 0 ? g.move(to: pt) : g.addLine(to: pt) } }
path(); g.setStrokeColor(col(40, 34, 30)); g.setLineWidth(ch * 0.92); g.strokePath()
path(); g.setStrokeColor(road); g.setLineWidth(ch * 0.8); g.strokePath()
// пунктир по центру
path(); g.setLineCap(.butt); g.setLineDash(phase: 0, lengths: [ch * 0.22, ch * 0.30])
g.setStrokeColor(col(226, 190, 80)); g.setLineWidth(ch * 0.05); g.strokePath(); g.setLineDash(phase: 0, lengths: [])
// вход (стрелка вниз вдоль дороги) и выход (красный квадрат — заправка)
let e = wp[0]; g.setFillColor(col(255, 200, 70))
g.move(to: CGPoint(x: cx(e.0), y: cy(e.1) - ch*0.22)); g.addLine(to: CGPoint(x: cx(e.0) - cw*0.1, y: cy(e.1) + ch*0.1))
g.addLine(to: CGPoint(x: cx(e.0) + cw*0.1, y: cy(e.1) + ch*0.1)); g.fillPath()
let x = wp[wp.count - 1]
g.setFillColor(col(190, 60, 40)); g.fill(CGRect(x: cx(x.0) - cw*0.3, y: cy(x.1) - ch*0.3, width: cw*0.6, height: ch*0.6))
let img = g.makeImage()!
let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(d, img, nil); CGImageDestinationFinalize(d)
print("ok", a[1])
