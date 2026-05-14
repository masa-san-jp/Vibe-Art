export function openVRWithTexture(containerSel, dataUrl, caption=''){
  const container = document.querySelector(containerSel)
  container.innerHTML = ''
  const scene = document.createElement('a-scene')
  scene.setAttribute('embedded','')
  scene.innerHTML = `
    <a-assets>
      <img id="skytex" src="${dataUrl}" crossorigin="anonymous" />
    </a-assets>
    <a-sky src="#skytex" rotation="0 -90 0"></a-sky>
    <a-entity position="0 1.6 -1.6">
      <a-text value="${caption}" color="#F0E6C8" align="center" width="2.8"></a-text>
    </a-entity>
  `
  container.appendChild(scene)
}
