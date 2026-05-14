// src/main.js
import { initSim } from './sim.js';
import { renderMandala, renderMetrics, renderScenario, bindEthicsPanel, bindDebriefButtons, bindChoiceHandlers, nextScenarioOrDebrief, loadData, bindReset } from './ui.js';

async function boot(){
  await loadData();
  renderScenario();
  renderMetrics();
  renderMandala();
  bindEthicsPanel();
  bindDebriefButtons();
  bindReset();
  bindChoiceHandlers(()=>{
    renderMandala();
    renderMetrics();
    nextScenarioOrDebrief();
  });
  initSim();
}

window.addEventListener('DOMContentLoaded', boot);
