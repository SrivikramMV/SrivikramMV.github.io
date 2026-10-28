import {initResearchTheme} from './research-theme.js';
import {initReader} from './reader.js';

const documents = {
  trace: {title:'Correct Answers, Inaccurate Source Reports', subtitle:'A Controlled Trace-Transfer Study · Under review at ACL Rolling Review · 2026', url:'./assets/docs/trace-transfer.pdf',kind:'Research paper'},
  monitor: {title:'Monitoring Conflict Resolution in Reasoning Language Models',subtitle:'Chain-of-Thought Faithfulness and Prospective Monitoring at the Answer Boundary · Imperial College London · 2026',url:'./assets/docs/monitorability.pdf',kind:'Independent research'},
  fairness: {title:'Auditing Fairness in Large Language Models',subtitle:'Detection and Mitigation Strategies · Newcastle University · 2025',url:'./assets/docs/fairness.pdf',kind:'Independent research'},
  cv: {title:'Srivikram MV',subtitle:'Research, projects, education, and industry experience',url:'./assets/docs/cv.pdf',kind:'Curriculum vitae'}
};
const reader = initReader(documents);
document.querySelectorAll('[data-document]').forEach(button => button.addEventListener('click', () => {
  closeMenu();
  reader.open(button.dataset.document, Number(button.dataset.page) || 1);
}));

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
initResearchTheme();

const menuButton=document.querySelector('.menu-toggle');
const mobileNav=document.querySelector('#mobile-nav');
function closeMenu(){mobileNav.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open menu');document.body.classList.remove('menu-open');document.querySelector('main').inert=false;}
menuButton.addEventListener('click',()=>{const open=menuButton.getAttribute('aria-expanded')!=='true';mobileNav.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close menu':'Open menu');document.body.classList.toggle('menu-open',open);document.querySelector('main').inert=open;});
mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobileNav.hidden){closeMenu();menuButton.focus();}});
matchMedia('(min-width: 951px)').addEventListener('change',e=>{if(e.matches)closeMenu();});

const kernel=document.querySelector('.kernel-grid');
for(let i=0;i<48;i++)kernel.append(document.createElement('i'));
document.querySelector('#year').textContent=new Date().getFullYear();

