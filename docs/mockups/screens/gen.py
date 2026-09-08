import math, json

FONTS = '<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">'

def theme(dark=True):
    if dark:
        return dict(bg="#0e1c1d", panel="#152a2b", panel2="#1b3435", line="#2a4a4b", text="#f1e9d8",
                    muted="#93aaa8", teal="#2fa7ab", tealdim="#1c7a80", orange="#e8912b", lane="#0a1414")
    return dict(bg="#f3ecdd", panel="#fbf6ea", panel2="#efe6d3", line="#d7cbb3", text="#0e1c1d",
                muted="#5f6f6e", teal="#1a7f86", tealdim="#156a70", orange="#d9821a", lane="#1a1a1a")

def css(t):
    return f"""
    * {{ box-sizing:border-box; }}
    body {{ margin:0; background:{t['bg']}; color:{t['text']}; font-family:'Atkinson Hyperlegible', 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing:antialiased; }}
    a {{ color:{t['teal']}; }} a:hover {{ color:{t['orange']}; }}
    .screen {{ width:390px; height:844px; overflow:hidden; background:{t['bg']}; display:flex; flex-direction:column; position:relative; }}
    .serif {{ font-family:'DM Serif Display', Georgia, 'Times New Roman', serif; font-weight:400; }}
    .mono {{ font-family:'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace; }}
    .cap {{ font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:{t['muted']}; }}
    .hair {{ height:1px; background:{t['line']}; }}
    .btn {{ display:flex; align-items:center; justify-content:center; min-height:48px; border-radius:10px; border:1px solid {t['line']}; background:{t['panel']}; color:{t['text']}; font-size:16px; font-weight:700; }}
    .btn-primary {{ background:{t['teal']}; border-color:{t['teal']}; color:#08191a; }}
    .btn-orange {{ background:{t['orange']}; border-color:{t['orange']}; color:#1a1206; }}
    .field {{ display:flex; align-items:center; gap:10px; min-height:56px; padding:0 14px; border:1px solid {t['line']}; border-radius:10px; background:{t['panel']}; }}
    .field .lab {{ flex:1 1 auto; font-size:15px; color:{t['muted']}; }}
    .field .val {{ font-size:22px; color:{t['text']}; min-width:88px; text-align:right; }}
    .unit {{ display:flex; align-items:center; gap:6px; min-height:36px; padding:0 10px; border-radius:8px; border:1px solid {t['line']}; background:{t['panel2']}; font-size:14px; font-weight:700; color:{t['text']}; }}
    .tile {{ display:flex; flex-direction:column; justify-content:space-between; min-height:124px; padding:14px; border:1px solid {t['line']}; border-radius:12px; background:{t['panel']}; }}
    .tile .name {{ font-size:19px; font-weight:700; color:{t['text']}; }}
    .tile .sub {{ font-size:12px; color:{t['muted']}; margin-top:2px; }}
    .tile .idx {{ font-size:11px; color:{t['orange']}; }}
    .chip {{ display:inline-flex; align-items:center; gap:8px; min-height:40px; padding:0 12px; border-radius:20px; border:1px solid {t['line']}; background:{t['panel2']}; font-size:14px; font-weight:700; color:{t['text']}; }}
    .ico {{ width:22px; height:22px; stroke:{t['teal']}; fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }}
    """

def page(t, body):
    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {FONTS}
  <style>{css(t)}</style>
</helmet>
{body}
</x-dc>
</body>
</html>
"""

# ---- icons (24px stroke) ----
I = {
 "drop": '<svg class="ico" viewBox="0 0 24 24"><path d="M12 3 C12 3 5 11 5 15 a7 7 0 0 0 14 0 C19 11 12 3 12 3 Z"></path><path d="M9 15 a3 3 0 0 0 3 3"></path></svg>',
 "scale": '<svg class="ico" viewBox="0 0 24 24"><path d="M12 4 v16"></path><path d="M4 8 h16"></path><path d="M6 8 l-3 7 a3 3 0 0 0 6 0 Z"></path><path d="M18 8 l-3 7 a3 3 0 0 0 6 0 Z"></path><path d="M8 20 h8"></path></svg>',
 "swap": '<svg class="ico" viewBox="0 0 24 24"><path d="M4 8 h13"></path><path d="M14 4 l4 4 -4 4"></path><path d="M20 16 H7"></path><path d="M10 12 l-4 4 4 4"></path></svg>',
 "clock": '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"></circle><path d="M12 9 v4 l3 2"></path><path d="M9 3 h6"></path></svg>',
 "tally": '<svg class="ico" viewBox="0 0 24 24"><path d="M5 5 v14"></path><path d="M9 5 v14"></path><path d="M13 5 v14"></path><path d="M17 5 v14"></path><path d="M3 17 L20 7"></path></svg>',
 "lanes": '<svg class="ico" viewBox="0 0 24 24"><rect x="5" y="3" width="6" height="18" rx="1.5"></rect><rect x="14" y="3" width="6" height="18" rx="1.5"></rect><path d="M6.5 8 h3"></path><path d="M6.5 12 h3"></path><path d="M6.5 17 h3"></path><path d="M15.5 7 h3"></path><path d="M15.5 14 h3"></path></svg>',
 "plate": '<svg class="ico" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8" cy="10" r="1.4"></circle><circle cx="12" cy="10" r="1.4"></circle><circle cx="16" cy="10" r="1.4"></circle><circle cx="8" cy="14.5" r="1.4"></circle><circle cx="12" cy="14.5" r="1.4"></circle><circle cx="16" cy="14.5" r="1.4"></circle></svg>',
 "list": '<svg class="ico" viewBox="0 0 24 24"><path d="M9 6 h11"></path><path d="M9 12 h11"></path><path d="M9 18 h11"></path><path d="M4 6 l1 1 2-2"></path><path d="M4 12 l1 1 2-2"></path><circle cx="5" cy="18" r="1"></circle></svg>',
 "rotor": '<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="6" r="1.6"></circle><circle cx="17.2" cy="15" r="1.6"></circle><circle cx="6.8" cy="15" r="1.6"></circle></svg>',
 "back": '<svg class="ico" viewBox="0 0 24 24" style="width:24px;height:24px"><path d="M15 5 l-7 7 7 7"></path></svg>',
 "play": '<svg class="ico" viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#1a1206"><path d="M7 5 v14 l11-7 Z"></path></svg>',
}

def header(t, title, idx=None, right=""):
    idx_html = f'<span class="mono" style="font-size:12px;color:{t["orange"]}">{idx}</span>' if idx else ""
    return f"""
<div style="display:flex; align-items:center; gap:12px; padding:58px 20px 12px 16px;">
  <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:22px;border:1px solid {t['line']}">{I['back']}</div>
  <div style="flex:1 1 auto; display:flex; align-items:baseline; gap:10px;">
    <span class="serif" style="font-size:26px; color:{t['text']}">{title}</span>{idx_html}
  </div>
  {right}
</div>
<div class="hair" style="margin:0 16px"></div>"""

# ---------------- HOME ----------------
def home(dark=True):
    t = theme(dark)
    tools = [("01","drop","Dilution","C1V1 = C2V2"),("02","scale","Molar","mass · mol · M"),
             ("03","swap","Convert","units, ×g ↔ rpm, A260"),("04","clock","Timer","alarms, presets"),
             ("05","tally","Counter","colonies, cells"),("06","lanes","Ladders","DNA · RNA · protein"),
             ("07","plate","Plates","area, seeding"),("08","list","Protocols","step by step")]
    tiles = "".join(f"""
    <div class="tile">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">{I[ic]}<span class="idx mono">{n}</span></div>
      <div><div class="name">{name}</div><div class="sub">{sub}</div></div>
    </div>""" for n,ic,name,sub in tools)
    body = f"""
<div class="screen">
  <div style="padding:60px 20px 14px 20px; display:flex; align-items:flex-end; justify-content:space-between;">
    <div>
      <div class="serif" style="font-size:36px; line-height:1; color:{t['text']}">Bench<span style="color:{t['teal']}">Mate</span></div>
      <div class="cap" style="margin-top:8px; display:flex; align-items:center; gap:8px;"><span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:{t['orange']}"></span>TggR Lab</div>
    </div>
    <div class="mono" style="font-size:12px; color:{t['muted']}">offline</div>
  </div>
  <div class="hair" style="margin:0 20px"></div>
  <div style="padding:16px 20px 0 20px; display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:12px; align-content:start; flex:1 1 auto;">
    {tiles}
    <div class="tile" style="grid-column:span 2; min-height:76px; flex-direction:row; align-items:center; gap:14px; border-color:{t['orange']}">
      {I['rotor']}
      <div style="flex:1 1 auto"><div class="name"><span style="color:{t['orange']}">Σ</span>pinZero</div><div class="sub">balance the rotor</div></div>
      <span class="idx mono">09</span>
    </div>
  </div>
  <div style="padding:10px 20px 18px 20px; display:flex; justify-content:space-between;" class="mono">
    <span style="font-size:11px; color:{t['muted']}">v0.1 · prototype</span>
    <span style="font-size:11px; color:{t['muted']}">no ads · no accounts</span>
  </div>
</div>"""
    return page(t, body)

# ---------------- DILUTION ----------------
def dilution():
    t = theme(True)
    def row(label, val, unit, solved=False):
        border = f"border-color:{t['orange']}; box-shadow:inset 0 0 0 1px {t['orange']};" if solved else ""
        valcol = t['orange'] if solved else t['text']
        tag = f'<span class="mono" style="font-size:10px;color:{t["orange"]};letter-spacing:0.15em;">SOLVED</span>' if solved else ""
        return f"""
    <div class="field" style="{border}">
      <div class="lab">{label}<br>{tag}</div>
      <div class="val mono" style="color:{valcol}">{val}</div>
      <div class="unit">{unit}<svg viewBox="0 0 24 24" style="width:14px;height:14px;stroke:{t['muted']};fill:none;stroke-width:2"><path d="M6 9 l6 6 6-6"></path></svg></div>
    </div>"""
    body = f"""
<div class="screen">
  {header(t, "Dilution", "01")}
  <div style="padding:16px 16px 0 16px; display:flex; flex-direction:column; gap:10px;">
    {row("Stock concentration", "10", "mM")}
    {row("Final concentration", "12.5", "µM")}
    {row("Final volume", "1000", "µL")}
    {row("Stock volume", "1.25", "µL", solved=True)}
    <div class="cap" style="padding:6px 2px 0 2px;">Leave one field empty. It gets solved.</div>
  </div>
  <div style="margin:16px 16px 0 16px; padding:18px 16px; border-radius:12px; background:{t['panel2']}; border:1px solid {t['line']};">
    <div style="display:flex; align-items:baseline; gap:12px;">
      <span class="mono" style="font-size:40px; color:{t['orange']}; line-height:1">1.25</span><span class="mono" style="font-size:16px; color:{t['muted']}">µL stock</span>
    </div>
    <div style="display:flex; align-items:baseline; gap:12px; margin-top:6px;">
      <span class="mono" style="font-size:40px; color:{t['teal']}; line-height:1">998.75</span><span class="mono" style="font-size:16px; color:{t['muted']}">µL diluent</span>
    </div>
    <div style="margin-top:14px; font-size:15px; line-height:1.4; color:{t['text']}">Add <strong>1.25 µL</strong> of stock to <strong>998.75 µL</strong> of diluent. Dilution factor 1 : 800.</div>
    <div style="display:flex; gap:10px; margin-top:14px;">
      <div class="btn" style="flex:1 1 0">Copy</div>
      <div class="btn" style="flex:1 1 0">Serial…</div>
      <div class="btn" style="flex:1 1 0; color:{t['muted']}">Clear</div>
    </div>
  </div>
  <div style="padding:18px 16px 0 16px;">
    <div class="cap">Recent</div>
    <div style="display:flex; flex-direction:column; margin-top:8px;">
      <div style="display:flex; justify-content:space-between; min-height:44px; align-items:center; font-size:14px;"><span style="color:{t['muted']}">10 mM → 1 µM · 500 µL</span><span class="mono" style="color:{t['text']}">0.05 µL</span></div>
      <div class="hair"></div>
      <div style="display:flex; justify-content:space-between; min-height:44px; align-items:center; font-size:14px;"><span style="color:{t['muted']}">1 mg/mL → 10 µg/mL · 2 mL</span><span class="mono" style="color:{t['text']}">20 µL</span></div>
    </div>
  </div>
</div>"""
    return page(t, body)

# ---------------- TIMER ----------------
def timer():
    t = theme(True)
    # progress ring: 15:00 total, 12:47 left -> 15% elapsed
    r = 110; c = 2*math.pi*r; done = 0.15
    presets = "".join(f'<div class="chip" style="justify-content:center; font-size:13px;">{p}</div>' for p in ["30 s","1 min","5 min","15 min","30 min","1 h"])
    body = f"""
<div class="screen">
  {header(t, "Timer", "04")}
  <div style="display:flex; flex-direction:column; align-items:center; padding-top:16px;">
    <div style="position:relative; width:260px; height:260px;">
      <svg viewBox="0 0 260 260" style="width:260px;height:260px; transform:rotate(-90deg)">
        <circle cx="130" cy="130" r="{r}" fill="none" stroke="{t['line']}" stroke-width="6"></circle>
        <circle cx="130" cy="130" r="{r}" fill="none" stroke="{t['orange']}" stroke-width="6" stroke-linecap="round" stroke-dasharray="{c:.1f}" stroke-dashoffset="{c*(1-done):.1f}"></circle>
      </svg>
      <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;">
        <div class="mono" style="font-size:64px; line-height:1; color:{t['text']}; letter-spacing:-0.02em">12:47</div>
        <div class="cap" style="color:{t['teal']}">Lyse · Dual-Glo</div>
        <div class="mono" style="font-size:12px; color:{t['muted']}">of 15:00</div>
      </div>
    </div>
    <div style="display:flex; gap:12px; margin-top:18px; width:100%; padding:0 24px;">
      <div class="btn btn-orange" style="flex:2 1 0; min-height:56px; font-size:18px">Pause</div>
      <div class="btn" style="flex:1 1 0; min-height:56px">Reset</div>
    </div>
  </div>
  <div style="padding:22px 16px 0 16px;">
    <div class="cap">Presets</div>
    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">{presets}<div class="chip" style="border-style:dashed; color:{t['muted']}">+ custom</div></div>
  </div>
  <div style="padding:18px 16px 0 16px; flex:1 1 auto;">
    <div class="cap">Also running</div>
    <div style="display:flex; flex-direction:column; margin-top:6px;">
      <div style="display:flex; align-items:center; gap:12px; min-height:52px;">
        <span style="width:8px;height:8px;border-radius:4px;background:{t['teal']}"></span>
        <span style="flex:1 1 auto; font-size:15px;">DNase · RNA isolation</span>
        <span class="mono" style="font-size:18px; color:{t['text']}">03:12</span>
      </div>
      <div class="hair"></div>
      <div style="display:flex; align-items:center; gap:12px; min-height:52px;">
        <span style="width:8px;height:8px;border-radius:4px;background:{t['orange']}"></span>
        <span style="flex:1 1 auto; font-size:15px; color:{t['muted']}">Medium change · Lipo 3000</span>
        <span class="mono" style="font-size:18px; color:{t['muted']}">2:10:40</span>
      </div>
    </div>
  </div>
  <div class="mono" style="padding:0 16px 18px 16px; font-size:11px; color:{t['muted']}">screen stays awake while a timer runs</div>
</div>"""
    return page(t, body)

# ---------------- LADDERS ----------------
def ladders():
    t = theme(True)
    bands = json.load(open('/home/user/benchmate/core/data/ladders/generuler-1kb-plus.json'))['bands']
    top, bot = math.log10(20000), math.log10(75); H = 410; pad = 30
    items = ""
    for b in bands:
        y = pad + (top-math.log10(b['size']))/(top-bot)*H
        ref = b.get('reference')
        th = 7 if ref else 4
        col = t['text'] if ref else "#c9c2b2"
        w = "bold" if ref else "normal"
        items += f'<div style="position:absolute; left:10px; width:56px; top:{y-th/2:.0f}px; height:{th}px; border-radius:2px; background:{col}; box-shadow:0 0 6px rgba(241,233,216,0.35)"></div>'
        items += f'<div class="mono" style="position:absolute; left:84px; top:{y-8:.0f}px; font-size:13px; font-weight:{w}; color:{t["text"] if ref else t["muted"]}">{b["size"]:,}</div>'
        items += f'<div class="mono" style="position:absolute; left:150px; top:{y-8:.0f}px; font-size:13px; color:{t["orange"] if ref else t["muted"]}">{b["ng"]}</div>'
    seg = lambda label, on: f'<div style="flex:1 1 0; min-height:40px; display:flex; align-items:center; justify-content:center; border-radius:8px; font-size:14px; font-weight:700; background:{t["teal"] if on else "transparent"}; color:{"#08191a" if on else t["muted"]}">{label}</div>'
    body = f"""
<div class="screen">
  {header(t, "Ladders", "06")}
  <div style="margin:14px 16px 0 16px; padding:4px; display:flex; gap:4px; border:1px solid {t['line']}; border-radius:10px; background:{t['panel']}">
    {seg("DNA", True)}{seg("RNA", False)}{seg("Protein", False)}
  </div>
  <div style="padding:14px 16px 0 16px; display:flex; align-items:baseline; justify-content:space-between;">
    <div><div style="font-size:17px; font-weight:700">GeneRuler 1 kb Plus</div><div class="mono" style="font-size:12px; color:{t['muted']}; margin-top:2px">SM1332 · Thermo</div></div>
    <div class="chip" style="min-height:36px">change</div>
  </div>
  <div style="margin:12px 16px 0 16px; position:relative; height:{H+2*pad}px; border-radius:12px; background:{t['panel']}; border:1px solid {t['line']}; overflow:hidden;">
    <div style="position:absolute; left:8px; top:8px; bottom:8px; width:60px; border-radius:6px; background:{t['lane']}"></div>
    <div class="cap" style="position:absolute; left:84px; top:8px; font-size:9px">bp</div>
    <div class="cap" style="position:absolute; left:150px; top:8px; font-size:9px">ng</div>
    {items}
    <div class="mono" style="position:absolute; right:14px; bottom:12px; font-size:11px; color:{t['muted']}; text-align:right; line-height:1.5">0.5 µg / lane<br>1 % agarose · 1X TAE<br>7 V/cm · 45 min</div>
  </div>
  <div style="padding:12px 16px 0 16px; display:flex; gap:10px;">
    <div class="btn" style="flex:1 1 0">Compare two</div>
    <div class="btn" style="flex:1 1 0">Band mass…</div>
  </div>
</div>"""
    return page(t, body)

# ---------------- PROTOCOL ----------------
def protocol():
    t = theme(True)
    steps = 10; cur = 5
    segs = "".join(f'<div style="flex:1 1 0; height:4px; border-radius:2px; background:{t["teal"] if i<cur-1 else (t["orange"] if i==cur-1 else t["line"])}"></div>' for i in range(steps))
    rows = [("Opti-MEM","25 µL","165 µL"),("DNA","500 ng","3.3 µg"),("P3000 Reagent","1 µL","6.6 µL")]
    table = "".join(f"""
      <div style="display:flex; align-items:center; min-height:44px; gap:8px;">
        <span style="flex:1 1 auto; font-size:15px">{a}</span>
        <span class="mono" style="width:70px; text-align:right; font-size:14px; color:{t['muted']}">{b}</span>
        <span class="mono" style="width:78px; text-align:right; font-size:17px; color:{t['orange']}">{c}</span>
      </div><div class="hair"></div>""" for a,b,c in rows)
    body = f"""
<div class="screen">
  {header(t, "Lipo 3000", None, f'<div class="chip" style="min-height:36px; border-color:{t["teal"]}">6 wells</div>')}
  <div style="padding:14px 16px 0 16px;">
    <div style="display:flex; gap:4px;">{segs}</div>
    <div style="display:flex; justify-content:space-between; margin-top:8px;" class="mono">
      <span style="font-size:12px; color:{t['muted']}">step {cur} of {steps}</span>
      <span style="font-size:12px; color:{t['muted']}">24-well</span>
    </div>
  </div>
  <div style="padding:22px 20px 0 20px; flex:1 1 auto;">
    <div class="serif" style="font-size:34px; line-height:1.1; color:{t['text']}">Mix B: Opti-MEM + DNA + P3000</div>
    <div style="margin-top:12px; font-size:18px; line-height:1.45; color:{t['text']}">Add P3000 last.</div>
    <div style="margin-top:18px; padding:12px 14px; border-radius:12px; background:{t['panel']}; border:1px solid {t['line']}">
      <div style="display:flex; justify-content:space-between;" class="cap"><span>Master mix</span><span style="color:{t['orange']}">6 wells + 10 %</span></div>
      <div style="margin-top:4px;">{table}</div>
      <div style="display:flex; align-items:center; gap:10px; margin-top:10px; min-height:44px;">
        <span class="cap" style="flex:0 0 auto">Plasmid</span>
        <span class="mono" style="flex:1 1 auto; font-size:15px; color:{t['teal']}; border-bottom:1px dashed {t['teal']}; padding-bottom:2px">pNF-κB-luc + pRL-TK</span>
      </div>
    </div>
    <div style="margin-top:14px; padding:12px 14px; border-radius:12px; background:{t['panel2']}; border:1px solid {t['line']}; font-size:14px; color:{t['muted']}">Mix well. No need to vortex.</div>
  </div>
  <div style="padding:0 16px 24px 16px; display:flex; gap:10px;">
    <div class="btn" style="flex:1 1 0; min-height:60px; font-size:17px">Back</div>
    <div class="btn btn-primary" style="flex:2 1 0; min-height:60px; font-size:17px">Next: Combine</div>
  </div>
</div>"""
    return page(t, body)

# ---------------- COUNTER ----------------
def counter():
    t = theme(True)
    body = f"""
<div class="screen">
  {header(t, "Counter", "05")}
  <div style="padding:24px 20px 0 20px; text-align:center;">
    <div class="cap" style="color:{t['teal']}">Colonies · plate 3 · 10⁻⁴</div>
    <div class="mono" style="font-size:112px; line-height:1; margin-top:8px; color:{t['text']}; letter-spacing:-0.03em">127</div>
    <div class="mono" style="font-size:13px; color:{t['muted']}; margin-top:6px">plate 1: 142 · plate 2: 131</div>
  </div>
  <div style="margin:22px 20px 0 20px; flex:1 1 auto; border-radius:16px; background:{t['teal']}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;">
    <div class="serif" style="font-size:34px; color:#08191a">tap anywhere</div>
    <div class="cap" style="color:#0e3d3f">+1 · haptic tick</div>
  </div>
  <div style="padding:14px 20px 24px 20px; display:flex; gap:10px;">
    <div class="btn" style="flex:1 1 0; min-height:56px">−1</div>
    <div class="btn" style="flex:1 1 0; min-height:56px; color:{t['muted']}">Reset</div>
    <div class="btn btn-orange" style="flex:1.4 1 0; min-height:56px">Next plate</div>
  </div>
</div>"""
    return page(t, body)

open('Main.dc.html','w').write(home(True))
open('HomeCream.dc.html','w').write(home(False))
open('Dilution.dc.html','w').write(dilution())
open('Timer.dc.html','w').write(timer())
open('Ladders.dc.html','w').write(ladders())
open('Protocol.dc.html','w').write(protocol())
open('Counter.dc.html','w').write(counter())

canvas = {
  "artboards": [
    {"file":"Main.dc.html","title":"Home","x":0,"y":0,"w":390,"h":844},
    {"file":"Dilution.dc.html","x":480,"y":0,"w":390,"h":844},
    {"file":"Timer.dc.html","x":960,"y":0,"w":390,"h":844},
    {"file":"Ladders.dc.html","x":1440,"y":0,"w":390,"h":844},
    {"file":"Protocol.dc.html","x":1920,"y":0,"w":390,"h":844},
    {"file":"Counter.dc.html","x":2400,"y":0,"w":390,"h":844},
    {"file":"HomeCream.dc.html","title":"Home (cream alternate)","x":0,"y":1000,"w":390,"h":844}
  ],
  "annotations": [
    {"id":"brief","x":0,"y":-170,"w":420,"text":"BenchMate phone screens, 390×844. Static mockups.\nDirection: 1970s bench instrument. Deep teal ground, cream text, orange for the thing you act on or the number you were looking for, teal for structure.\nType: DM Serif Display (wordmark, step titles) · Atkinson Hyperlegible (UI) · JetBrains Mono (every number)."},
    {"id":"cream-note","x":480,"y":1000,"w":300,"text":"Alternate ground: cream paper instead of deep teal. Same components, same accents. Pick one, or keep both as light/dark."},
    {"id":"ladder-note","x":1440,"y":-110,"w":340,"text":"Bands drawn from core/data/ladders/generuler-1kb-plus.json on a log scale. Reference bands (5000, 1500, 500) are heavier and show ng in orange."},
    {"id":"protocol-note","x":1920,"y":-110,"w":340,"text":"Step 5 of the Lipofectamine 3000 sheet. The per-well lines from the Word doc become a master-mix table: wells × amount + 10 %."}
  ],
  "launch": {"view":"canvas"}
}
json.dump(canvas, open('canvas.json','w'), indent=1)
print("written")
