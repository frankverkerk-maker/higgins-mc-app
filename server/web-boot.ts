/**
 * Expo's static export prerenders an empty root. On a slow network the user
 * sees only black until a large JS bundle downloads. Serve a lightweight,
 * self-removing boot message before React takes over.
 */
export function withWebBootShell(html: string): string {
  if (html.includes('id="higgins-boot"')) return html;
  if (!/<div id="root">\s*<div/i.test(html)) return html;
  const style = `<style id="higgins-boot-style">
#higgins-boot{position:fixed;inset:0;z-index:9999;background:#101415;color:#e9eeee;display:flex;align-items:center;justify-content:center;font:500 16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#higgins-boot span{border:2px solid #31504f;border-top-color:#00d4d4;border-radius:50%;width:24px;height:24px;display:inline-block;animation:higgins-spin .8s linear infinite;margin-right:12px}
@keyframes higgins-spin{to{transform:rotate(360deg)}}
</style>`;
  const boot = `<div id="higgins-boot" role="status" aria-live="polite"><span aria-hidden="true"></span>Higgins MC laden…</div>
<script>(function(){var root=document.getElementById('root'),boot=document.getElementById('higgins-boot');if(!root||!boot)return;function done(){if(root.textContent&&root.textContent.trim()){boot.remove();observer.disconnect();clearTimeout(slow)}}var observer=new MutationObserver(done);observer.observe(root,{childList:true,subtree:true,characterData:true});done();var slow=setTimeout(function(){if(boot.isConnected)boot.lastChild.textContent='Laden duurt langer dan verwacht. Controleer uw verbinding.'},30000)})()</script>`;
  return html.replace(/<\/head>/i, `${style}</head>`).replace(/<\/body>/i, `${boot}</body>`);
}
