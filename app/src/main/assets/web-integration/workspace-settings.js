/* DSH Web settings: fill the viewport, then append direct native workspace tools. */
(function () {
  'use strict';
  if (window.top !== window || window.__dshaWorkspaceSettingsInstalled) return;
  window.__dshaWorkspaceSettingsInstalled = true;
  var entries = [
    ['运行与日志', '启动 · 重启 · 停止 · 启动日志', 'runtime', '▶'],
    ['插件管理', '安装、更新与管理 DSH 插件', 'plugins', '▣'],
    ['终端', '运行环境命令行', 'terminal', '>_'],
    ['安装与修复运行环境', '部署与修复内置 Ubuntu', 'install', '⬡'],
    ['接口、显示与运行', '模型接口与运行参数', 'config', '⚙'],
    ['数据与备份', '备份恢复 · 文件共享', 'backup', '▤'],
    ['设备能力授权', 'Root · Shizuku · ADB · 权限', 'grants', '◇']
  ];
  var style = document.createElement('style');
  style.textContent = '[data-dsha-workspace-tools]{padding:12px 20px 32px;font-family:system-ui,sans-serif;color:inherit}'
    + '[data-dsha-workspace-tools] h3{font-size:15px;font-weight:700;margin:16px 0 10px}'
    + '[data-dsha-workspace-tools] button{display:flex;align-items:center;width:100%;text-align:left;border:0;border-bottom:1px solid rgba(128,128,128,.16);background:transparent;color:inherit;min-height:60px;padding:9px 4px;cursor:pointer}'
    + '[data-dsha-workspace-tools] button:active{opacity:.65}'
    + '[data-dsha-workspace-tools] .dsha-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:rgba(95,103,220,.12);color:#6065ce;font-weight:bold;margin-right:12px;flex:none}'
    + '[data-dsha-workspace-tools] small{display:block;font-size:11px;opacity:.66;margin-top:3px}'
    + '[data-dsha-workspace-tools] .dsha-chevron{margin-left:auto;opacity:.55}'
    + 'body:has([data-dsha-workspace-tools]) [role=dialog],body:has([data-dsha-workspace-tools]) [aria-modal=true],body:has([data-dsha-workspace-tools]) dialog[open]{max-height:100dvh!important;height:100dvh!important;min-height:100dvh!important;max-width:100vw!important;width:100vw!important;margin:0!important;border-radius:0!important;inset:0!important;transform:none!important}'
    + 'body:has([data-dsha-workspace-tools]) [role=dialog] > *,body:has([data-dsha-workspace-tools]) [aria-modal=true] > *{max-height:100dvh!important}'
    + 'body:has([data-dsha-workspace-tools]) [role=dialog] [data-radix-scroll-area-viewport]{max-height:calc(100dvh - 74px)!important}';
  (document.head || document.documentElement).appendChild(style);
  function visible(e) { return e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden'; }
  function isSettings(e) {
    if (!visible(e)) return false;
    var text = e.textContent || '';
    return (text.includes('通用设置') || text.includes('General Settings')) && (text.includes('工作步骤展示') || text.includes('Work Steps') || text.includes('外观') || text.includes('Appearance'));
  }
  function apply() {
    var dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog[open]');
    for (var i=0;i<dialogs.length;i++) {
      var dialog=dialogs[i];
      if (!isSettings(dialog) || dialog.querySelector('[data-dsha-workspace-tools]')) continue;
      var scroll = dialog.querySelector('[data-radix-scroll-area-viewport]') || Array.from(dialog.querySelectorAll('*')).find(function(e){return e.scrollHeight>e.clientHeight+50 && getComputedStyle(e).overflowY!=='visible';}) || dialog;
      var wrapper = document.createElement('section');
      wrapper.setAttribute('data-dsha-workspace-tools','');
      var header = document.createElement('h3'); header.textContent='工作台'; wrapper.appendChild(header);
      entries.forEach(function(entry){
        var btn=document.createElement('button'); btn.type='button'; btn.setAttribute('aria-label',entry[0]);
        var icon=document.createElement('span'); icon.className='dsha-icon'; icon.textContent=entry[3]; btn.appendChild(icon);
        var label=document.createElement('span'); label.appendChild(document.createTextNode(entry[0]));
        var desc=document.createElement('small'); desc.textContent=entry[1]; label.appendChild(desc); btn.appendChild(label);
        var arrow=document.createElement('span'); arrow.className='dsha-chevron'; arrow.textContent='›'; btn.appendChild(arrow);
        btn.addEventListener('click',function(){ if(window.DshaNativeSettings) window.DshaNativeSettings.postMessage(entry[2]); });
        wrapper.appendChild(btn);
      });
      scroll.appendChild(wrapper);
    }
  }
  var queued=false;
  function start(){
    if(!document.documentElement){setTimeout(start,20);return;}
    new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;apply();});})
      .observe(document.documentElement,{subtree:true,childList:true});
    apply();
  }
  start();
})();
