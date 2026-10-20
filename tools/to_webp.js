// Конвертация картинок игры в WebP средствами браузера (с прозрачностью). Запуск:
//   1) из папки проекта:  python3 -m http.server 8777   и   python3 tools/webp_receiver.py . 8778
//   2) открыть http://localhost:8777/, вставить этот файл в консоль, затем:  await __toWebp()
// Файл-список строится по текущему содержимому assets/ (нужен tools/webp_manifest.json — см. ниже), результат пишется рядом с исходниками:
//   assets/x.png → assets/x.webp,  assets/map*.jpg → assets/map*.webp  (PNG/JPG остаются запасным вариантом).
// Манифест: ls assets/*.png assets/props/*.png assets/*.jpg | python3 -c "import sys,json;print(json.dumps([l.strip() for l in sys.stdin]))" > tools/webp_manifest.json
window.__toWebp = async function (quality) {
  const list = await (await fetch('tools/webp_manifest.json', { cache: 'reload' })).json();
  let ok = 0, bad = [], before = 0, after = 0;
  for (const f of list) {
    try {
      const blob = await (await fetch(f, { cache: 'reload' })).blob(); before += blob.size;
      const bmp = await createImageBitmap(blob);
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
      c.getContext('2d').drawImage(bmp, 0, 0);
      const q = quality || (/map.*\.jpg$|menu_boss/.test(f) ? .8 : .9);
      const out = await new Promise(r => c.toBlob(r, 'image/webp', q));
      if (!out || out.type !== 'image/webp') throw new Error('нет WebP');
      after += out.size;
      const dst = f.replace(/\.(png|jpg)$/, '.webp');
      await fetch('http://localhost:8778/save?path=' + encodeURIComponent(dst), { method: 'POST', body: out, mode: 'no-cors' });
      ok++;
    } catch (e) { bad.push(f + ': ' + e.message); }
  }
  return { файлов: ok, ошибки: bad, было_МБ: +(before / 1e6).toFixed(1), стало_МБ: +(after / 1e6).toFixed(1) };
};
