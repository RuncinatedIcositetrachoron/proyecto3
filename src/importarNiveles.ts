import { apiAEditor } from "./parserApi";
import type { NivelAPI } from "./parserApi";
import { crearNivel, actualizarNivel } from "./niveles";
import type { LevelsScene } from "./levelsscene";

export function abrirImportacionNiveles(escena: LevelsScene): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.style.display = "none";
  document.body.appendChild(input);

  input.addEventListener("cancel", () => {
    input.remove();
  });

  input.addEventListener("change", async () => {
    const archivos = input.files;
    input.remove();

    if (archivos === null || archivos.length === 0) {
      return;
    }

    const contenido = await archivos[0].text();
    const niveles: NivelAPI[] = JSON.parse(contenido);

    for (let i = 0; i < niveles.length; i++) {
      const nivel = apiAEditor(niveles[i]);
      const nuevo = await crearNivel(11, 17);
      nivel.id = nuevo.id;
      nivel.ultimaModificacion = Date.now();
      await actualizarNivel(nivel);
    }

    escena.mostrarNiveles();
  });

  input.click();
}