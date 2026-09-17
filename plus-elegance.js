(() => {
  const STYLE_ID = 'nmPlusEleganceStyles';
  const FONT_ID = 'nmPlusEleganceFonts';

  function installFonts() {
    if (document.getElementById(FONT_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_ID;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      :root{
        --nm-plus-ink:#4a2d40;
        --nm-plus-plum:#6f405b;
        --nm-plus-muted:#81757b;
        --nm-plus-cream:#fffaf4;
        --nm-plus-blush:#f8eee9;
        --nm-plus-line:#eadfd9;
        --nm-plus-gold:#a9875f;
        --nm-plus-serif:'Cormorant Garamond', Georgia, serif;
        --nm-plus-sans:'Inter', ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .nm-plus-overlay{
        background:rgba(47,34,41,.48)!important;
        backdrop-filter:blur(7px);
        -webkit-backdrop-filter:blur(7px);
        opacity:0;
        visibility:hidden;
        display:flex!important;
        pointer-events:none;
        transition:opacity .28s cubic-bezier(.22,.61,.36,1),visibility .28s;
      }
      .nm-plus-overlay.open{
        opacity:1;
        visibility:visible;
        pointer-events:auto;
      }
      .nm-plus-sheet{
        position:relative;
        overflow-x:hidden!important;
        background:
          radial-gradient(circle at 94% 2%,rgba(188,145,166,.13),transparent 26%),
          linear-gradient(180deg,#fffdf9 0%,#fffaf5 100%)!important;
        border:1px solid rgba(234,223,217,.78);
        border-bottom:0;
        border-radius:30px 30px 0 0!important;
        box-shadow:0 -22px 70px rgba(69,44,56,.18)!important;
        transform:translateY(34px) scale(.992);
        opacity:.35;
        transition:transform .34s cubic-bezier(.22,.61,.36,1),opacity .28s ease;
        font-family:var(--nm-plus-sans);
      }
      .nm-plus-overlay.open .nm-plus-sheet{transform:translateY(0) scale(1);opacity:1}
      .nm-plus-sheet::before{
        content:'';
        display:block;
        width:38px;
        height:4px;
        margin:-4px auto 14px;
        border-radius:999px;
        background:rgba(111,64,91,.18);
      }

      .nm-plus-head{margin-bottom:20px!important;align-items:flex-start!important}
      .nm-plus-kicker{
        font-family:var(--nm-plus-sans)!important;
        font-size:10px!important;
        font-weight:600!important;
        letter-spacing:.18em!important;
        color:var(--nm-plus-gold)!important;
      }
      .nm-plus-title{
        font-family:var(--nm-plus-serif)!important;
        font-size:36px!important;
        line-height:.98!important;
        letter-spacing:-.025em;
        font-weight:600!important;
        color:var(--nm-plus-ink)!important;
        margin:7px 0 8px!important;
      }
      .nm-plus-sub{
        font-family:var(--nm-plus-sans)!important;
        font-size:13px!important;
        line-height:1.62!important;
        color:var(--nm-plus-muted)!important;
        max-width:390px;
      }
      .nm-plus-close{
        border-color:rgba(111,64,91,.12)!important;
        background:rgba(255,255,255,.74)!important;
        color:var(--nm-plus-plum)!important;
        box-shadow:0 4px 15px rgba(69,44,56,.05);
        transition:transform .18s ease,background .18s ease,box-shadow .18s ease!important;
      }
      .nm-plus-close:active{transform:scale(.92)}

      .nm-plus-card{
        border-color:rgba(234,223,217,.9)!important;
        border-radius:20px!important;
        padding:17px!important;
        background:rgba(255,255,255,.76)!important;
        box-shadow:0 7px 24px rgba(70,45,54,.045)!important;
        opacity:0;
        transform:translateY(10px);
        transition:transform .24s ease,box-shadow .24s ease,border-color .24s ease,background .24s ease,opacity .32s ease;
      }
      .nm-plus-overlay.open .nm-plus-card.nm-plus-revealed{opacity:1;transform:translateY(0)}
      .nm-plus-card:hover{border-color:rgba(160,124,142,.35)!important;box-shadow:0 11px 32px rgba(70,45,54,.065)!important}
      .nm-plus-card h3{
        font-family:var(--nm-plus-serif)!important;
        font-weight:600!important;
        font-size:22px!important;
        line-height:1.05!important;
        letter-spacing:-.01em;
        color:var(--nm-plus-ink)!important;
        margin-bottom:6px!important;
      }
      .nm-plus-card p{font-family:var(--nm-plus-sans)!important;line-height:1.58!important;color:var(--nm-plus-muted)!important}

      .nm-plus-go,.nm-plus-secondary,.nm-plus-account button{
        font-family:var(--nm-plus-sans)!important;
        letter-spacing:.01em;
        transition:transform .16s ease,box-shadow .2s ease,filter .2s ease,background .2s ease!important;
      }
      .nm-plus-go{
        background:linear-gradient(135deg,#75435f,#68405a)!important;
        box-shadow:0 7px 18px rgba(117,67,95,.15);
      }
      .nm-plus-go:hover{filter:brightness(1.025);box-shadow:0 9px 22px rgba(117,67,95,.2)}
      .nm-plus-go:active,.nm-plus-secondary:active,.nm-plus-account button:active{transform:scale(.965)}

      .nm-plus-field{
        border-color:rgba(230,220,215,.86)!important;
        background:rgba(255,252,248,.84)!important;
        border-radius:16px!important;
      }
      .nm-plus-field label{font-family:var(--nm-plus-sans)!important;font-weight:600!important;letter-spacing:.01em}
      .nm-plus-field input,.nm-plus-field select,.nm-plus-notes{font-family:var(--nm-plus-sans)!important;transition:border-color .2s ease,box-shadow .2s ease,background .2s ease}
      .nm-plus-field input:focus,.nm-plus-field select:focus,.nm-plus-notes:focus{outline:none;border-color:rgba(117,67,95,.4)!important;box-shadow:0 0 0 4px rgba(117,67,95,.06);background:#fff!important}

      .nm-plus-progress{height:8px!important;background:#f0e7e1!important}
      .nm-plus-progress i{background:linear-gradient(90deg,#8c5d77,#6d405a)!important;transform-origin:left;animation:nmPlusGrow .65s cubic-bezier(.22,.61,.36,1) both}
      .nm-plus-celebrate{
        background:linear-gradient(135deg,rgba(248,235,230,.92),rgba(255,251,247,.98))!important;
        border-color:rgba(234,216,210,.82)!important;
        border-radius:18px!important;
        position:relative;
        overflow:hidden;
      }
      .nm-plus-celebrate::after{
        content:'♡';
        position:absolute;
        right:14px;
        top:10px;
        font-family:var(--nm-plus-serif);
        font-size:28px;
        color:rgba(117,67,95,.12);
        animation:nmPlusBreath 3.8s ease-in-out infinite;
      }

      .nm-plus-account{
        position:relative;
        overflow:hidden;
        border:1px solid rgba(183,147,164,.28)!important;
        border-radius:21px!important;
        padding:16px 16px!important;
        background:
          radial-gradient(circle at 100% 0,rgba(185,143,164,.18),transparent 36%),
          linear-gradient(135deg,#fff9f5 0%,#f9efeb 100%)!important;
        box-shadow:0 8px 26px rgba(88,53,72,.065);
      }
      .nm-plus-account::before{
        content:'♡';
        position:absolute;
        right:72px;
        top:-18px;
        font-family:var(--nm-plus-serif);
        font-size:68px;
        color:rgba(111,64,91,.045);
        transform:rotate(-8deg);
        pointer-events:none;
      }
      .nm-plus-account strong{
        font-family:var(--nm-plus-serif)!important;
        font-weight:600!important;
        font-size:20px!important;
        line-height:1.05;
        letter-spacing:-.01em;
        color:var(--nm-plus-ink)!important;
      }
      .nm-plus-account span{font-family:var(--nm-plus-sans)!important;line-height:1.5!important}
      .nm-founder-pill{
        border:1px solid rgba(169,135,95,.22);
        background:linear-gradient(135deg,#f5e8df,#f9f1eb)!important;
        color:#8a6849!important;
        font-weight:700!important;
        letter-spacing:.12em!important;
        box-shadow:0 3px 12px rgba(169,135,95,.06);
        animation:nmPlusFounderGlow 5s ease-in-out infinite;
      }

      .nm-plus-metric b{
        font-family:var(--nm-plus-serif)!important;
        font-size:23px!important;
        font-weight:600!important;
      }
      .nm-plus-small{font-family:var(--nm-plus-sans)!important;color:#91858a!important}
      .nm-plus-toast{font-family:var(--nm-plus-sans)!important;box-shadow:0 10px 30px rgba(62,39,50,.22);transition:opacity .24s ease,transform .3s cubic-bezier(.22,.61,.36,1)!important}

      @keyframes nmPlusGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
      @keyframes nmPlusBreath{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.12);opacity:1}}
      @keyframes nmPlusFounderGlow{0%,100%{box-shadow:0 3px 12px rgba(169,135,95,.06)}50%{box-shadow:0 4px 18px rgba(169,135,95,.15)}}

      @media(max-width:390px){
        .nm-plus-title{font-size:32px!important}
        .nm-plus-sheet{border-radius:27px 27px 0 0!important}
      }
      @media(prefers-reduced-motion:reduce){
        .nm-plus-overlay,.nm-plus-sheet,.nm-plus-card,.nm-plus-go,.nm-plus-secondary,.nm-plus-account button,.nm-plus-progress i,.nm-plus-celebrate::after,.nm-founder-pill{animation:none!important;transition:none!important}
        .nm-plus-card{opacity:1!important;transform:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function revealCards(root) {
    const cards = [...root.querySelectorAll('.nm-plus-card')];
    cards.forEach((card, index) => {
      card.classList.remove('nm-plus-revealed');
      window.setTimeout(() => card.classList.add('nm-plus-revealed'), 65 + index * 48);
    });
  }

  function polishOverlay(overlay) {
    if (!overlay || overlay.dataset.nmElegance === '1') return;
    overlay.dataset.nmElegance = '1';
    const observer = new MutationObserver(() => {
      if (overlay.classList.contains('open')) revealCards(overlay);
    });
    observer.observe(overlay, { attributes:true, attributeFilter:['class'] });
    if (overlay.classList.contains('open')) revealCards(overlay);
  }

  function install() {
    installFonts();
    installStyles();
    document.querySelectorAll('.nm-plus-overlay').forEach(polishOverlay);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches?.('.nm-plus-overlay')) polishOverlay(node);
          node.querySelectorAll?.('.nm-plus-overlay').forEach(polishOverlay);
        }
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();