/* DSHA settings: verified centered modal with a separate workspace page. */
(function () {
  'use strict';
  if (window.top !== window) return;
  var REVISION = 'workspace-tab-v10';
  var previous = window.__dshaWorkspaceSettingsController;
  if (previous && previous.revision === REVISION) return;
  if (previous && typeof previous.dispose === 'function') previous.dispose();
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
  var diagnostics = {revision: REVISION, events: []};
  window.__dshaSettingsDiagnostics = diagnostics;
  var stopped = false, observer, frame = 0, timer = 0, current = null, serial = 0, logs = 0;
  var style = document.createElement('style');
  style.id = 'dsha-workspace-settings-style';
  style.textContent = [
    '[data-dsha-settings-panel]{box-sizing:border-box!important}',
    '[data-dsha-settings-nav-list]{display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;overflow-x:auto!important;min-width:0!important}',
    '[data-dsha-settings-nav-list]>button{flex:0 0 auto!important;width:auto!important;white-space:nowrap!important}',
    '[data-dsha-workspace-tab]{font:inherit;cursor:pointer}',
    '[data-dsha-workspace-active] [data-dsha-native-current]{background:transparent!important;box-shadow:none!important}',
    '[data-dsha-workspace-active] [data-dsha-workspace-tab]{background:rgba(95,103,220,.14)!important;font-weight:650!important}',
    '[data-dsha-workspace-active] [data-dsha-settings-options],[data-dsha-workspace-active] [data-slot="settings.action"]{display:none!important}',
    '[data-dsha-workspace-page]{box-sizing:border-box!important;flex:1 1 0!important;min-height:0!important;min-width:0!important;width:100%!important;overflow:auto!important;overscroll-behavior:contain;padding:0 18px 14px;color:inherit}',
    '[data-dsha-workspace-page][hidden]{display:none!important}',
    '[data-dsha-workspace-tools]{padding:0!important;font-family:system-ui,sans-serif;color:inherit}',
    '[data-dsha-workspace-tools] h3{font-size:16px;font-weight:700;margin:6px 0 8px}',
    '[data-dsha-workspace-tools] button{box-sizing:border-box;display:flex;align-items:center;width:100%;text-align:left;border:0;border-bottom:1px solid rgba(128,128,128,.16);background:transparent;color:inherit;min-height:54px;padding:8px 0;cursor:pointer;font:inherit;font-size:14px}',
    '[data-dsha-workspace-tools] button:focus-visible,[data-dsha-workspace-tab]:focus-visible{outline:2px solid #6065ce;outline-offset:-2px}',
    '[data-dsha-workspace-tools] button:active{opacity:.65}',
    '[data-dsha-workspace-tools] .dsha-icon{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;background:rgba(95,103,220,.12);color:#6065ce;font-weight:bold;margin-right:10px;flex:none}',
    '[data-dsha-workspace-tools] .dsha-label{min-width:0}',
    '[data-dsha-workspace-tools] small{display:block;font-size:11px;opacity:.66;margin-top:3px}',
    '[data-dsha-workspace-tools] .dsha-chevron{margin-left:auto;padding-left:6px;opacity:.55}',
    '[data-dsha-workspace-error]{color:#ba3232;font-size:12px}'
  ].join('\n');
  function report(event, data) {
    var item = {event:event, time:new Date().toISOString(), data:data};
    diagnostics.events.push(item);
    if (diagnostics.events.length > 40) diagnostics.events.shift();
    if (logs++ < 100) console.info('[DSHA_SETTINGS] ' + JSON.stringify(item));
  }
  function part(root, name) {
    return root.querySelector('[class$="_' + name + '"],[class*="_' + name + ' "]');
  }
  function css(element, values) {
    if (!element) return;
    Object.keys(values).forEach(function (key) {
      if (element.style.getPropertyValue(key) !== values[key] || element.style.getPropertyPriority(key) !== 'important')
        element.style.setProperty(key, values[key], 'important');
    });
  }
  function buildTools() {
    var section = document.createElement('section');
    section.setAttribute('data-dsha-workspace-tools', '');
    var title = document.createElement('h3'); title.textContent = '工作台'; section.appendChild(title);
    var error = document.createElement('p'); error.hidden = true; error.setAttribute('role', 'status');
    error.setAttribute('data-dsha-workspace-error', '');
    entries.forEach(function (entry) {
      var button = document.createElement('button'); button.type = 'button';
      button.setAttribute('data-dsha-workspace-route', entry[2]); button.setAttribute('aria-label', entry[0]);
      var icon = document.createElement('span'); icon.className = 'dsha-icon'; icon.textContent = entry[3]; icon.setAttribute('aria-hidden', 'true');
      var label = document.createElement('span'); label.className = 'dsha-label'; label.appendChild(document.createTextNode(entry[0]));
      var description = document.createElement('small'); description.textContent = entry[1]; label.appendChild(description);
      var arrow = document.createElement('span'); arrow.className = 'dsha-chevron'; arrow.textContent = '›'; arrow.setAttribute('aria-hidden', 'true');
      button.appendChild(icon); button.appendChild(label); button.appendChild(arrow);
      button.addEventListener('click', function () {
        try {
          if (!window.DshaNativeSettings || typeof window.DshaNativeSettings.postMessage !== 'function') throw new Error('native bridge unavailable');
          window.DshaNativeSettings.postMessage(entry[2]); error.hidden = true;
          report('route', {key:entry[2]});
        } catch (failure) {
          error.textContent = '原生入口暂不可用，请在 DSHA 内打开此页面。'; error.hidden = false;
          report('route-error', {key:entry[2], message:String(failure.message)});
        }
      });
      section.appendChild(button);
    });
    section.appendChild(error);
    return section;
  }
  function markNative(state, active) {
    if (active) {
      var button = state.navList.querySelector('button[aria-current]:not([data-dsha-workspace-tab])');
      if (button) {
        state.nativeCurrent = button; state.nativeCurrentValue = button.getAttribute('aria-current');
        button.setAttribute('data-dsha-native-current', ''); button.removeAttribute('aria-current');
      }
    } else if (state.nativeCurrent) {
      if (state.nativeCurrent.isConnected) {
        state.nativeCurrent.setAttribute('aria-current', state.nativeCurrentValue);
        state.nativeCurrent.removeAttribute('data-dsha-native-current');
      }
      state.nativeCurrent = null;
    }
  }
  function select(state, active, focus) {
    var changed = state.active !== active;
    state.active = active;
    state.panel.toggleAttribute('data-dsha-workspace-active', active);
    state.page.hidden = !active;
    if (active) state.tab.setAttribute('aria-current', 'page'); else state.tab.removeAttribute('aria-current');
    state.tab.setAttribute('aria-pressed', String(active));
    if (state.options) {
      state.options.inert = active || state.optionsInert;
      if (active) state.options.setAttribute('aria-hidden', 'true');
      else if (state.optionsAria === null) state.options.removeAttribute('aria-hidden');
      else state.options.setAttribute('aria-hidden', state.optionsAria);
    }
    markNative(state, active);
    if (active && changed) state.page.scrollTop = 0;
    if (focus) state.tab.focus({preventScroll:true});
    if (changed) report('page', {name:active ? 'workspace' : 'native', rows:state.page.querySelectorAll('[data-dsha-workspace-route]').length});
  }
  function attach(panel, navList, content) {
    var state = {panel:panel, navList:navList, content:content, active:false, options:null, nativeCurrent:null};
    var tab = document.createElement('button'); tab.type = 'button';
    var sample = navList.querySelector('button');
    tab.className = sample ? Array.from(sample.classList).filter(function (c) {return !/_active$/.test(c);}).join(' ') : '';
    tab.textContent = '工作台'; tab.id = 'dsha-workspace-tab-' + (++serial);
    tab.setAttribute('aria-label', '工作台'); tab.setAttribute('data-dsha-workspace-tab', '');
    var page = document.createElement('section'); page.hidden = true; page.id = 'dsha-workspace-page-' + serial;
    page.setAttribute('role', 'region'); page.setAttribute('aria-labelledby', tab.id);
    page.setAttribute('data-dsha-workspace-page', ''); tab.setAttribute('aria-controls', page.id);
    page.appendChild(buildTools()); state.page = page; state.tab = tab;
    // Remove only our obsolete injected nodes. Never detach React-owned settings.
    Array.from(panel.querySelectorAll('[data-dsha-workspace-tools]')).forEach(function (node) {node.remove();});
    navList.insertBefore(tab, sample ? sample.nextSibling : null); content.appendChild(page);
    tab.addEventListener('click', function (event) {event.preventDefault(); event.stopPropagation(); select(state, true, false);});
    state.onNativeClick = function (event) {
      var button = event.target.closest && event.target.closest('button');
      if (button && button !== tab && navList.contains(button)) select(state, false, false);
    };
    navList.addEventListener('click', state.onNativeClick, true);
    report('attached', {selector:'[data-shortcut-modal="settings"]', placement:'separate-page', routes:entries.length});
    return state;
  }
  function configure(panel) {
    var nav = panel.querySelector('nav'), navList = nav && part(nav, 'navList');
    var content = part(panel, 'content'), options = part(panel, 'options');
    if (!navList || !content || !options) return;
    if (!current || current.panel !== panel || current.navList !== navList || current.content !== content) {
      if (current) current.navList.removeEventListener('click', current.onNativeClick, true);
      current = attach(panel, navList, content);
    }
    var state = current;
    panel.setAttribute('data-dsha-settings-panel', ''); navList.setAttribute('data-dsha-settings-nav-list', '');
    // Reset inset before top/left: a later inset:auto would erase the center.
    css(panel, {position:'fixed', inset:'auto', top:'50%', left:'50%', right:'auto', bottom:'auto', transform:'translate(-50%,-50%)',
      width:'min(90vw,540px)', height:'min(76dvh,680px)', 'max-width':'90vw', 'max-height':'76dvh', 'min-height':'0', margin:'0',
      'box-sizing':'border-box', 'border-radius':'18px', 'z-index':'2147483640', display:'flex', 'flex-direction':'column', overflow:'hidden'});
    css(nav, {width:'100%', 'box-sizing':'border-box', 'min-width':'0', flex:'0 0 auto'});
    css(content, {width:'100%', 'min-height':'0', 'min-width':'0', height:'auto', flex:'1 1 0', display:'flex', 'flex-direction':'column', overflow:'hidden'});
    css(options, {'min-height':'0', 'overflow-y':'auto'});
    options.setAttribute('data-dsha-settings-options', '');
    if (state.options !== options) {
      state.options = options; state.optionsAria = options.getAttribute('aria-hidden'); state.optionsInert = options.inert;
    }
    if (state.tab.parentElement !== navList) navList.insertBefore(state.tab, navList.children[1] || null);
    if (state.page.parentElement !== content) content.appendChild(state.page);
    select(state, state.active, false);
    var rect = panel.getBoundingClientRect();
    var geometry = {x:Math.round(rect.x*100)/100,y:Math.round(rect.y*100)/100,width:Math.round(rect.width*100)/100,height:Math.round(rect.height*100)/100,
      viewport:{width:innerWidth,height:innerHeight},pageOutsideOptions:!options.contains(state.page)};
    var key = JSON.stringify(geometry);
    if (state.geometry !== key) {state.geometry = key; report('geometry', geometry);}
  }
  function apply() {
    if (stopped) return;
    var panel = document.querySelector('[data-shortcut-modal="settings"][role="dialog"]');
    if (panel && panel.getClientRects().length) configure(panel);
    else if (current) {current.navList.removeEventListener('click', current.onNativeClick, true); current = null;}
  }
  function schedule() {
    if (stopped || frame) return;
    frame = requestAnimationFrame(function () {frame = 0; try {apply();} catch (error) {report('error', {message:String(error.message)});}});
  }
  function start() {
    if (stopped) return;
    if (!document.documentElement) {timer = setTimeout(start, 20); return;}
    var oldStyle = document.getElementById(style.id); if (oldStyle) oldStyle.remove();
    (document.head || document.documentElement).appendChild(style);
    observer = new MutationObserver(schedule); observer.observe(document.documentElement, {subtree:true,childList:true});
    window.addEventListener('resize', schedule); schedule();
  }
  window.__dshaWorkspaceSettingsController = {revision:REVISION, dispose:function () {
    stopped = true; clearTimeout(timer); cancelAnimationFrame(frame); if (observer) observer.disconnect();
    window.removeEventListener('resize', schedule);
    if (current) {select(current,false,false);current.navList.removeEventListener('click',current.onNativeClick,true);current.tab.remove();current.page.remove();}
    style.remove();
  }};
  report('installed', {ready:document.readyState,bridge:typeof window.DshaNativeSettings});
  start();
})();
