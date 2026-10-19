#!/bin/zsh
# Пересобирает спрайты из assets_hf/raw (первая партия) и assets_hf/raw2 (вторая) в assets_hf/*.png
# Нужен скомпилированный cutout: swiftc -O tools/cutout.swift -o /tmp/cutout
C=${CUTOUT:-/private/tmp/claude-501/cutout}; R1=assets_hf/raw; R2=assets_hf/raw2; O=assets_hf
b(){ $C "$1" "$O/$2.png" ${3:-256} ${4:-256} >/dev/null; }
h(){ $C "$1" "$O/$2.png" 256 256 pivot >/dev/null; }
b $R1/armor.jpg armor 307 230; b $R1/raider.jpg raider 256 192; b $R1/biker.jpg biker 205 128; b $R1/boss.jpg boss 512 256
b $R1/mg_base.jpg mg_base; b $R1/sp_base.jpg sp_base; b $R1/slot.jpg slot; b $R1/station.jpg station; b $R1/rubble.jpg rubble
h $R1/sp_head.jpg sp_head
h $R2/18.jpg mg_head; h $R2/11.jpg mg_head2; h $R2/12.jpg mg_head3
h $R2/16.jpg fl_head; h $R2/08.jpg fl_head2; h $R2/07.jpg fl_head3
h $R2/04.jpg sp_head2; h $R2/03.jpg sp_head3
b $R2/14.jpg mg_base2; b $R2/13.jpg mg_base3
b $R2/17.jpg fl_base; b $R2/10.jpg fl_base2; b $R2/09.jpg fl_base3
b $R2/06.jpg sp_base2; b $R2/05.jpg sp_base3
b $R2/15.jpg gen_base; b $R2/02.jpg gen_base2; b $R2/01.jpg gen_base3
b $R1/shield.jpg shield 307 230; b $R1/sniper.jpg sniper 288 216
R3=assets_hf/raw3
b $R3/tes_base.jpg tes_base; h $R3/tes_head.jpg tes_head; b $R3/mor_base.jpg mor_base; h $R3/mor_head.jpg mor_head
h $R3/mg3a.jpg mg_head3a; h $R3/mg3b.jpg mg_head3b; h $R3/fl3a.jpg fl_head3a; h $R3/fl3b.jpg fl_head3b; h $R3/sp3a.jpg sp_head3a; h $R3/sp3b.jpg sp_head3b
b $R3/medic.jpg medic 288 216; b $R3/drone.png drone 192 192
echo done
