# Chess Diagram Sheet Generator

Generador de planchas imprimibles de diagramas de ajedrez a partir
de posiciones FEN, desarrollado con Google Sheets y Google Apps Script.

## Características

- Generación de diagramas desde FEN
- Orientación desde blancas o negras
- Coordenadas opcionales
- Piezas gráficas en PNG
- 12 diagramas por página tamaño Carta
- Guías de corte
- Exportación automática a PDF
- Soporte para múltiples páginas
- Reintentos automáticos ante errores de inserción de imágenes

## Hoja de entrada

Crear una hoja denominada `Posiciones` con las columnas:

| Columna | Campo |
|---|---|
| A | Imprimir |
| B | ID |
| C | FEN |
| D | Orientación |
| E | Coordenadas |

`Imprimir` y `Coordenadas` utilizan casillas de verificación.

La orientación admite:

- `Blancas`
- `Negras`
