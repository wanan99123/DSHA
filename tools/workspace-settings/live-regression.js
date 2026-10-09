(async function () {
  var result={tests:[],revision:window.__dshaSettingsDiagnostics&&window.__dshaSettingsDiagnostics.revision};
  function check(name,pass,detail){result.tests.push({name:name,pass:!!pass,detail:detail});}
  function delay(){return new Promise(function(r){setTimeout(r,220);});}
  function panel(){return document.querySelector('[data-shortcut-modal="settings"]');}
  function nativeTab(text){return Array.from(panel().querySelectorAll('nav button')).find(function(b){return b.textContent.trim()===text;});}
  function state(){var p=panel(),page=p&&p.querySelector('[data-dsha-workspace-page]'),o=p&&p.querySelector('[data-dsha-settings-options]');return {active:p&&p.hasAttribute('data-dsha-workspace-active'),pageHidden:page&&page.hidden,nativeDisplay:o&&getComputedStyle(o).display,nativeInert:o&&o.inert,legacy:o&&o.querySelectorAll('[data-dsha-workspace-tools]').length,count:p&&p.querySelectorAll('[data-dsha-workspace-tools]').length};}
  check('workspace_selected',state().active,state());
  nativeTab('通用设置').click();await delay();
  check('general_restored',state().pageHidden&&state().nativeDisplay!=='none'&&!state().nativeInert&&state().legacy===0,state());
  var options=panel().querySelector('[data-dsha-settings-options]');options.scrollTop=80;var beforeScroll=options.scrollTop;
  panel().querySelector('[data-dsha-workspace-tab]').click();await delay();
  nativeTab('通用设置').click();await delay();
  check('general_scroll_preserved',options.scrollTop===beforeScroll,{before:beforeScroll,after:options.scrollTop});
  nativeTab('模型').click();await delay();
  check('model_tab_restored',!state().active&&state().pageHidden&&state().nativeDisplay!=='none'&&!state().nativeInert,state());
  panel().querySelector('[data-dsha-workspace-tab]').click();await delay();
  check('workspace_after_model',state().active&&state().count===1&&state().legacy===0,state());
  var p=panel(),r=p.getBoundingClientRect(),page=p.querySelector('[data-dsha-workspace-page]'),pr=page.getBoundingClientRect();
  check('centered_in_viewport',r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&Math.abs(r.left+r.width/2-innerWidth/2)<1&&Math.abs(r.top+r.height/2-innerHeight/2)<1,{panel:r.toJSON(),viewport:{width:innerWidth,height:innerHeight}});
  var rows=Array.from(page.querySelectorAll('[data-dsha-workspace-route]')).map(function(b){var q=b.getBoundingClientRect();var x=q.left+q.width/2,y=q.top+q.height/2;return {key:b.getAttribute('data-dsha-workspace-route'),inPage:q.top>=pr.top&&q.bottom<=pr.bottom,hit:b.contains(document.elementFromPoint(x,y))};});
  check('all_seven_rows_visible_clickable',rows.length===7&&rows.every(function(r){return r.inPage&&r.hit;}),rows);
  var closeLabel=p.querySelector('[data-slot="settings.close"]'),close=closeLabel&&closeLabel.closest('button');
  var cr=close&&close.getBoundingClientRect();
  check('close_button_visible',cr&&cr.width>0&&cr.height>0&&cr.x>=r.x&&cr.right<=r.right&&cr.y>=r.y&&cr.bottom<=r.bottom,{rect:cr&&cr.toJSON(),css:close&&getComputedStyle(close).display});
  if(close){close.click();await delay();check('close_uses_original_handler',!panel(),{modals:document.querySelectorAll('[data-shortcut-modal="settings"]').length});}
  var trigger=Array.from(document.querySelectorAll('button[aria-haspopup="dialog"]')).find(function(n){return /^(设置|Settings)$/.test(n.getAttribute('aria-label')||'');});
  if(trigger)trigger.click();await delay();
  check('reopen_single_workspace_tab',panel()&&panel().querySelectorAll('[data-dsha-workspace-tab]').length===1,{tabs:document.querySelectorAll('[data-dsha-workspace-tab]').length});
  if(panel()&&panel().querySelector('[data-dsha-workspace-tab]'))panel().querySelector('[data-dsha-workspace-tab]').click();await delay();
  check('reopen_workspace_independent',state().active&&state().legacy===0&&state().count===1,state());
  result.errors=(window.__dshaSettingsDiagnostics?window.__dshaSettingsDiagnostics.events:[]).filter(function(e){return e.event==='error';});
  result.pass=result.tests.every(function(t){return t.pass;})&&result.errors.length===0;
  return JSON.stringify(result);
})()