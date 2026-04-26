import re

with open("C:/Users/gutow/OneDrive/Desktop/elite_biomechanics_os.html", "r", encoding="utf-8") as f:
    html = f.read()

# 1. TITLE
html = html.replace('<title>Elite Biomechanics OS</title>', '<title>Windson Personal Trainer</title>')

# 2. PWA META TAGS
old_vp = '<meta content="width=device-width, initial-scale=1.0" name="viewport"/>'
new_vp = (
    '<meta content="width=device-width, initial-scale=1.0" name="viewport"/>\n'
    '<meta name="theme-color" content="#D4AF37"/>\n'
    '<meta name="apple-mobile-web-app-capable" content="yes"/>\n'
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>\n'
    '<meta name="apple-mobile-web-app-title" content="Windson PT"/>\n'
    '<meta name="description" content="Windson Personal Trainer - gestao de clientes, treinos e avaliacao postural IA"/>\n'
    '<link rel="manifest" href="manifest.json"/>\n'
    '<link rel="apple-touch-icon" href="icon.svg"/>'
)
html = html.replace(old_vp, new_vp)

# 3. TAILWIND CONFIG COLORS
old_colors = (
    '"surface-bright":"#39383e","tertiary-container":"#d97721","secondary-fixed":"#e1e0ff",\n'
    '        "background":"#131318","tertiary-fixed":"#ffdcc5","error":"#ffb4ab","outline":"#908fa0",\n'
    '        "inverse-primary":"#494bd6","on-tertiary-fixed-variant":"#703700","surface-dim":"#131318",\n'
    '        "inverse-on-surface":"#303036","tertiary":"#ffb783","error-container":"#93000a",\n'
    '        "primary-fixed-dim":"#c0c1ff","primary-fixed":"#e1e0ff","surface-tint":"#c0c1ff",\n'
    '        "on-secondary-fixed":"#13144a","secondary-container":"#42447b","inverse-surface":"#e4e1e9",\n'
    '        "primary":"#c0c1ff","surface-variant":"#35343a","on-tertiary-fixed":"#301400",\n'
    '        "secondary":"#c0c1ff","surface-container-low":"#1b1b20","on-tertiary":"#4f2500",\n'
    '        "outline-variant":"#464554","on-surface-variant":"#c7c4d7","on-tertiary-container":"#452000",\n'
    '        "on-error":"#690005","on-secondary-container":"#b2b3f2","on-secondary":"#292a60",\n'
    '        "surface-container-lowest":"#0e0e13","on-error-container":"#ffdad6","on-surface":"#e4e1e9",\n'
    '        "on-secondary-fixed-variant":"#404178","on-background":"#e4e1e9","on-primary-container":"#0d0096",\n'
    '        "primary-container":"#8083ff","surface-container-high":"#2a292f","surface":"#131318",\n'
    '        "on-primary-fixed":"#07006c","tertiary-fixed-dim":"#ffb783","surface-container":"#1f1f25",\n'
    '        "on-primary":"#1000a9","surface-container-highest":"#35343a","secondary-fixed-dim":"#c0c1ff",\n'
    '        "on-primary-fixed-variant":"#2f2ebe"'
)
new_colors = (
    '"surface-bright":"#2A2A2A","tertiary-container":"#7A5C00","secondary-fixed":"#F0C040",\n'
    '        "background":"#080808","tertiary-fixed":"#FFD700","error":"#ffb4ab","outline":"#666666",\n'
    '        "inverse-primary":"#9B7B0E","on-tertiary-fixed-variant":"#3D2E00","surface-dim":"#080808",\n'
    '        "inverse-on-surface":"#1A1A1A","tertiary":"#D4AF37","error-container":"#93000a",\n'
    '        "primary-fixed-dim":"#C9A227","primary-fixed":"#F0C040","surface-tint":"#D4AF37",\n'
    '        "on-secondary-fixed":"#0A0800","secondary-container":"#2D2200","inverse-surface":"#E8E0CC",\n'
    '        "primary":"#D4AF37","surface-variant":"#1E1E1E","on-tertiary-fixed":"#0A0600",\n'
    '        "secondary":"#D4AF37","surface-container-low":"#101010","on-tertiary":"#0A0600",\n'
    '        "outline-variant":"#2A2A2A","on-surface-variant":"#B0A070","on-tertiary-container":"#1A1000",\n'
    '        "on-error":"#690005","on-secondary-container":"#F0C040","on-secondary":"#0A0600",\n'
    '        "surface-container-lowest":"#050505","on-error-container":"#ffdad6","on-surface":"#F0E8CC",\n'
    '        "on-secondary-fixed-variant":"#3D2E00","on-background":"#F0E8CC","on-primary-container":"#1A0D00",\n'
    '        "primary-container":"#9B7B0E","surface-container-high":"#181818","surface":"#080808",\n'
    '        "on-primary-fixed":"#0A0600","tertiary-fixed-dim":"#D4AF37","surface-container":"#141414",\n'
    '        "on-primary":"#080808","surface-container-highest":"#222222","secondary-fixed-dim":"#D4AF37",\n'
    '        "on-primary-fixed-variant":"#3D2E00"'
)
if old_colors in html:
    html = html.replace(old_colors, new_colors)
    print("OK Tailwind colors replaced")
else:
    print("FAIL Tailwind colors NOT found - check exact match")

# 4. CSS body background
html = html.replace('background-color:#131318;', 'background-color:#080808;')

# 5. CSS gradients
html = html.replace(
    'background:linear-gradient(135deg,#c0c1ff,#8083ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;',
    'background:linear-gradient(135deg,#F0C040,#D4AF37,#9B7B0E);-webkit-background-clip:text;-webkit-text-fill-color:transparent;'
)
html = html.replace(
    'background:linear-gradient(135deg,#c0c1ff 0%,#8083ff 100%);',
    'background:linear-gradient(135deg,#F0C040 0%,#D4AF37 50%,#9B7B0E 100%);'
)

# 6. ambient shadow
html = html.replace(
    'box-shadow:0 0 64px 0 rgba(192,193,255,0.08);',
    'box-shadow:0 0 64px 0 rgba(212,175,55,0.08);'
)

# 7. nav-btn hover
html = html.replace(
    '.nav-btn:hover{color:#818cf8;filter:grayscale(0);opacity:1;}',
    '.nav-btn:hover{color:#D4AF37;filter:grayscale(0);opacity:1;}'
)

# 8. nav-btn active
old_nav_active = '.nav-btn.active{color:#818cf8;background:rgba(99,102,241,0.1);border-radius:0.75rem;padding:0.5rem 0.75rem;box-shadow:0 0 15px rgba(99,102,241,0.3);transform:scale(1.1) translateY(-4px);filter:grayscale(0);opacity:1;}'
new_nav_active = '.nav-btn.active{color:#D4AF37;background:rgba(212,175,55,0.12);border-radius:0.75rem;padding:0.5rem 0.75rem;box-shadow:0 0 15px rgba(212,175,55,0.35);transform:scale(1.1) translateY(-4px);filter:grayscale(0);opacity:1;}'
html = html.replace(old_nav_active, new_nav_active)

# 9. bg class with hard-coded color
html = html.replace('bg-[#131318]', 'bg-[#080808]')

# 10. Header replacement
old_header = (
    '    <div class="flex items-center gap-4">\n'
    '      <div class="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/30 relative">\n'
    '        <img alt="Elite Trainer" class="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiyLLkuo0OgdyJK010v8tcf5xeOShDE1IBrZZrcf3dry6MskiwQiONOunyhYrpMZvR5PelJWDpBgzNPP2GelQiXjCBAf7810f4anhSM8OCzi9JyVeY6HXwsKiG17JmUMdsxWjuHKkEORnld9stELKkgvV6QnDazQeYbW7Jq2g8grilX_rnMwSv5aja4W1QJi5MJOjQZOIUa9Vb0DizP5gSb52hoT0GRk4jKBlDn0g5u8Rhf5MGIv3ObgDQWTO5tKaol8nv-4UOgH0"/>\n'
    '      </div>\n'
    '      <h1 class="font-[\'Sora\'] font-bold text-xl font-black text-indigo-400 uppercase tracking-widest">Elite Biomechanics</h1>\n'
    '    </div>\n'
    '    <button class="text-indigo-400 hover:bg-white/5 transition-all scale-95 active:scale-90 duration-200 w-12 h-12 flex items-center justify-center rounded-full">\n'
    '      <span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 0;">notifications</span>\n'
    '    </button>'
)
new_header = (
    '    <div class="flex items-center gap-3">\n'
    '      <div class="w-10 h-10 shrink-0">\n'
    '        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-full h-full">\n'
    '          <defs><linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F0C040"/><stop offset="50%" stop-color="#D4AF37"/><stop offset="100%" stop-color="#8B6914"/></linearGradient></defs>\n'
    '          <path d="M48,80 L130,430 L192,240 L256,330 L320,240 L382,430 L464,80 L426,80 L344,390 L282,200 L256,260 L230,200 L168,390 L86,80 Z" fill="url(#hg)"/>\n'
    '          <path d="M243,180 L256,130 L269,180 L256,210 Z" fill="#F5D060" opacity="0.9"/>\n'
    '        </svg>\n'
    '      </div>\n'
    '      <div class="flex flex-col leading-none">\n'
    '        <h1 class="font-[\'Sora\'] font-black text-base uppercase tracking-widest" style="background:linear-gradient(135deg,#F0C040,#D4AF37);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Windson</h1>\n'
    '        <span class="text-[9px] uppercase tracking-[0.2em] font-medium" style="color:#9B7B0E;">Personal Trainer</span>\n'
    '      </div>\n'
    '    </div>\n'
    '    <button class="hover:bg-white/5 transition-all scale-95 active:scale-90 duration-200 w-12 h-12 flex items-center justify-center rounded-full" style="color:#D4AF37;">\n'
    '      <span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 0;">notifications</span>\n'
    '    </button>'
)
if old_header in html:
    html = html.replace(old_header, new_header)
    print("OK Header replaced")
else:
    print("FAIL Header NOT found")
    # Try to find it
    idx = html.find('Elite Trainer')
    if idx >= 0:
        print(f"  'Elite Trainer' found at position {idx}")
        print(repr(html[idx-200:idx+200]))

# 11. JS canvas colors
html = html.replace("cv.style.background='#0e0e13';", "cv.style.background='#050505';")
html = html.replace("ctx.fillStyle='#0e0e13'; ctx.fillRect", "ctx.fillStyle='#050505'; ctx.fillRect")
html = html.replace("ctx.strokeStyle='rgba(192,193,255,0.55)';", "ctx.strokeStyle='rgba(212,175,55,0.55)';")
html = html.replace("ctx.fillStyle='#c0c1ff';ctx.fill();}", "ctx.fillStyle='#D4AF37';ctx.fill();}")

# 12. avCol colors
html = html.replace(
    "function avCol(v,w,c){return v<w?'#c0c1ff':v<c?'#ffb783':'#ffb4ab';}",
    "function avCol(v,w,c){return v<w?'#D4AF37':v<c?'#F0A020':'#ffb4ab';}"
)

# 13. Remaining rgba purple references
for old_rgba, new_rgba in [
    ('rgba(192,193,255,0.1)', 'rgba(212,175,55,0.1)'),
    ('rgba(192,193,255,0.4)', 'rgba(212,175,55,0.4)'),
    ('rgba(192,193,255,0.5)', 'rgba(212,175,55,0.5)'),
    ('rgba(192,193,255,0.08)', 'rgba(212,175,55,0.08)'),
    ('rgba(192,193,255,0.3)', 'rgba(212,175,55,0.3)'),
    ('rgba(192,193,255,0.2)', 'rgba(212,175,55,0.2)'),
]:
    html = html.replace(old_rgba, new_rgba)

# 14. Service worker registration
sw_reg = """
// PWA: Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(r => console.log('[Windson PT] SW:', r.scope))
      .catch(e => console.warn('[Windson PT] SW error:', e));
  });
}
let _dPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _dPrompt = e;
  const b = document.getElementById('install-banner');
  if (b) b.classList.remove('hidden');
});
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('install-btn');
  if (btn) btn.addEventListener('click', async () => {
    if (!_dPrompt) return;
    _dPrompt.prompt();
    await _dPrompt.userChoice;
    _dPrompt = null;
    const b = document.getElementById('install-banner');
    if (b) b.classList.add('hidden');
  });
});
"""
html = html.replace('</script>\n</body>', sw_reg + '</script>\n</body>')

# 15. Install banner
banner = """
<div id="install-banner" class="hidden fixed top-20 left-4 right-4 z-50 rounded-2xl p-4 flex items-center gap-4" style="background:linear-gradient(135deg,#1A1200,#2A1E00);border:1px solid rgba(212,175,55,0.35);box-shadow:0 8px 32px rgba(212,175,55,0.2);">
  <div class="w-9 h-9 shrink-0">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="bi" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#F0C040"/><stop offset="100%" stop-color="#8B6914"/></linearGradient></defs><path d="M48,80 L130,430 L192,240 L256,330 L320,240 L382,430 L464,80 L426,80 L344,390 L282,200 L256,260 L230,200 L168,390 L86,80 Z" fill="url(#bi)"/></svg>
  </div>
  <div class="flex-1 min-w-0">
    <p class="font-bold text-sm truncate" style="color:#F0C040;">Instalar Windson PT</p>
    <p class="text-xs" style="color:#9B7B0E;">Acesse offline, como um app nativo</p>
  </div>
  <button id="install-btn" class="px-3 py-2 rounded-xl text-xs font-bold shrink-0" style="background:linear-gradient(135deg,#F0C040,#D4AF37);color:#080808;">Instalar</button>
  <button onclick="document.getElementById('install-banner').classList.add('hidden')" class="text-xs w-7 h-7 flex items-center justify-center rounded-full shrink-0" style="color:#666;background:rgba(255,255,255,0.05);">x</button>
</div>
"""
html = html.replace('</body>', banner + '\n</body>')

with open("C:/Users/gutow/OneDrive/Desktop/windson_pwa/index.html", "w", encoding="utf-8") as f:
    f.write(html)

line_count = html.count('\n')
print(f"Done! {line_count} lines written to windson_pwa/index.html")
