const CONFIG = {

  hojaEntrada: 'Posiciones',
  prefijoHojaSalida: 'Impresión',

  /*
   * ==========================================================
   * PAGINACIÓN
   * ==========================================================
   *
   * 3 columnas × 4 filas
   * = 12 diagramas por página Carta.
   */
  diagramasPorFila: 3,
  filasPorPagina: 4,
  diagramasPorPagina: 12,

  /*
   * ==========================================================
   * TABLERO
   * ==========================================================
   *
   * Reducimos apenas 1 px respecto
   * de la versión anterior.
   */
  tamanoCelda: 27,
  tamanoPieza: 25,

  /*
   * ==========================================================
   * COORDENADAS
   * ==========================================================
   *
   * Aumentamos la altura inferior para
   * que las letras a–h no se corten.
   */
  anchoCoordenada: 14,
  altoCoordenada: 15,
  tamanoFuenteCoordenada: 8,

  /*
   * ==========================================================
   * ETIQUETA
   * ==========================================================
   */
  tamanoFuenteEtiqueta: 9,
  altoEtiqueta: 17,

  /*
   * ==========================================================
   * SEPARACIONES
   * ==========================================================
   *
   * Dos columnas siguen permitiendo
   * colocar la línea de corte al centro.
   */
  columnasSeparacion: 2,
  filasSeparacion: 2,

  /*
   * Horizontalmente mantenemos
   * la separación actual.
   */
  anchoMitadSeparador: 14,

  /*
   * Verticalmente reducimos a:
   *
   * 3 px + 3 px = 6 px.
   */
  altoMitadSeparador: 3,

  /*
   * ==========================================================
   * COLORES
   * ==========================================================
   */
  colorClaro: '#F0D9B5',
  colorOscuro: '#B58863',
  colorTexto: '#111111',

  /*
   * Guías de corte.
   */
  colorGuiaCorte: '#9E9E9E'
};


/*
 * ============================================================
 * CACHÉ TEMPORAL
 * ============================================================
 */

let CACHE_BYTES_PIEZAS = {};


/*
 * ============================================================
 * MENÚ
 * ============================================================
 */

function onOpen() {

  SpreadsheetApp
    .getUi()
    .createMenu('♟ Ajedrez')
    .addItem(
      'Generar plancha de diagramas',
      'generarPlancha'
    )
    .addItem(
      'Exportar plancha a PDF',
      'exportarPDF'
    )
    .addSeparator()
    .addItem(
      'Generar plancha y PDF',
      'generarPlanchaYPDF'
    )
    .addToUi();
}


/*
 * ============================================================
 * GENERAR PLANCHA
 * ============================================================
 */

function generarPlancha() {

  try {

    const resultado =
      generarPlanchaInterna();

    SpreadsheetApp
      .getUi()
      .alert(
        'Plancha generada correctamente.\n\n' +
        `Diagramas: ${resultado.cantidad}\n` +
        `Páginas: ${resultado.paginas}`
      );

  } catch (error) {

    SpreadsheetApp
      .getUi()
      .alert(
        'Error al generar la plancha:\n\n' +
        error.message
      );
  }
}


/*
 * ============================================================
 * GENERACIÓN INTERNA
 * ============================================================
 */

function generarPlanchaInterna() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const entrada =
    ss.getSheetByName(
      CONFIG.hojaEntrada
    );


  if (!entrada) {

    throw new Error(
      `No existe la hoja "${CONFIG.hojaEntrada}".`
    );
  }


  /*
   * Reiniciar caché.
   */
  CACHE_BYTES_PIEZAS = {};


  const posiciones =
    leerPosiciones(
      entrada
    );


  if (
    posiciones.length === 0
  ) {

    throw new Error(
      'No hay posiciones seleccionadas para imprimir.'
    );
  }


  /*
   * Eliminar hojas de impresión anteriores.
   */
  eliminarHojasImpresion(
    ss
  );


  /*
   * 12 diagramas por página.
   */
  const paginas =
    Math.ceil(
      posiciones.length /
      CONFIG.diagramasPorPagina
    );


  for (
    let pagina = 0;
    pagina < paginas;
    pagina++
  ) {

    const numeroPagina =
      pagina + 1;


    const nombreHoja =
      `${CONFIG.prefijoHojaSalida} ${numeroPagina}`;


    const hoja =
      ss.insertSheet(
        nombreHoja
      );


    hoja.setHiddenGridlines(
      true
    );


    prepararHoja(
      hoja
    );


    const inicio =
      pagina *
      CONFIG.diagramasPorPagina;


    const fin =
      Math.min(
        inicio +
          CONFIG.diagramasPorPagina,
        posiciones.length
      );


    const posicionesPagina =
      posiciones.slice(
        inicio,
        fin
      );


    posicionesPagina.forEach(
      (posicion, indiceLocal) => {

        dibujarDiagrama(
          hoja,
          posicion,
          indiceLocal
        );
      }
    );


    /*
     * Procesar imágenes página por página.
     */
    SpreadsheetApp.flush();
  }


  /*
   * Mostrar primera página.
   */
  const primeraPagina =
    ss.getSheetByName(
      `${CONFIG.prefijoHojaSalida} 1`
    );


  if (
    primeraPagina
  ) {

    ss.setActiveSheet(
      primeraPagina
    );
  }


  SpreadsheetApp.flush();


  return {

    cantidad:
      posiciones.length,

    paginas:
      paginas
  };
}


/*
 * ============================================================
 * ELIMINAR HOJAS DE IMPRESIÓN
 * ============================================================
 */

function eliminarHojasImpresion(
  ss
) {

  const regex =
    new RegExp(
      '^' +
      CONFIG.prefijoHojaSalida +
      '(?: \\d+)?$'
    );


  const hojasEliminar =
    ss
      .getSheets()
      .filter(
        hoja =>
          regex.test(
            hoja.getName()
          )
      );


  hojasEliminar.forEach(
    hoja => {

      ss.deleteSheet(
        hoja
      );
    }
  );
}


/*
 * ============================================================
 * LEER POSICIONES
 * ============================================================
 *
 * A = Imprimir
 * B = ID
 * C = FEN
 * D = Orientación
 * E = Coordenadas
 */

function leerPosiciones(
  hoja
) {

  const ultimaFila =
    hoja.getLastRow();


  if (
    ultimaFila < 2
  ) {

    return [];
  }


  const datos =
    hoja
      .getRange(
        2,
        1,
        ultimaFila - 1,
        5
      )
      .getValues();


  const posiciones = [];


  datos.forEach(
    (fila, indice) => {

      const imprimir =
        fila[0];

      const id =
        fila[1];

      const fen =
        fila[2];

      const orientacion =
        fila[3] || 'Blancas';

      const coordenadas =
        fila[4] === true;


      if (
        imprimir === true &&
        fen &&
        String(fen).trim() !== ''
      ) {

        posiciones.push({

          filaOriginal:
            indice + 2,

          id:
            id ||
            `Posición ${indice + 1}`,

          fen:
            String(fen).trim(),

          orientacion:
            String(
              orientacion
            ).trim(),

          coordenadas:
            coordenadas
        });
      }
    }
  );


  return posiciones;
}


/*
 * ============================================================
 * PARSER FEN
 * ============================================================
 */

function parsearFEN(
  fen
) {

  const posicion =
    fen
      .trim()
      .split(/\s+/)[0];


  const filas =
    posicion.split('/');


  if (
    filas.length !== 8
  ) {

    throw new Error(
      'La FEN debe contener exactamente 8 filas.'
    );
  }


  const tablero = [];


  filas.forEach(
    (filaFen, indiceFila) => {

      const fila = [];


      for (
        const caracter of filaFen
      ) {

        if (
          /[1-8]/.test(
            caracter
          )
        ) {

          const vacias =
            Number(
              caracter
            );


          for (
            let i = 0;
            i < vacias;
            i++
          ) {

            fila.push('');
          }

        } else if (
          /[prnbqkPRNBQK]/.test(
            caracter
          )
        ) {

          fila.push(
            caracter
          );

        } else {

          throw new Error(
            `Carácter FEN no reconocido: "${caracter}".`
          );
        }
      }


      if (
        fila.length !== 8
      ) {

        throw new Error(
          `La fila ${8 - indiceFila} no contiene 8 casillas.`
        );
      }


      tablero.push(
        fila
      );
    }
  );


  return tablero;
}


/*
 * ============================================================
 * PREPARAR HOJA
 * ============================================================
 */

function prepararHoja(
  hoja
) {

  /*
   * 1 columna de coordenadas
   * + 8 columnas de tablero.
   */
  const anchoDiagrama =
    9;


  /*
   * 1 etiqueta
   * + 8 tablero
   * + 1 coordenadas.
   */
  const altoDiagrama =
    10;


  const totalColumnas =
    CONFIG.diagramasPorFila *
      anchoDiagrama +
    (
      CONFIG.diagramasPorFila - 1
    ) *
      CONFIG.columnasSeparacion;


  const totalFilas =
    CONFIG.filasPorPagina *
      altoDiagrama +
    (
      CONFIG.filasPorPagina - 1
    ) *
      CONFIG.filasSeparacion;


  /*
   * ==========================================================
   * ASEGURAR DIMENSIONES
   * ==========================================================
   */

  const columnasActuales =
    hoja.getMaxColumns();


  if (
    columnasActuales <
    totalColumnas
  ) {

    hoja.insertColumnsAfter(
      columnasActuales,
      totalColumnas -
        columnasActuales
    );
  }


  const filasActuales =
    hoja.getMaxRows();


  if (
    filasActuales <
    totalFilas
  ) {

    hoja.insertRowsAfter(
      filasActuales,
      totalFilas -
        filasActuales
    );
  }


  /*
   * ==========================================================
   * ANCHOS DE COLUMNAS
   * ==========================================================
   */

  for (
    let bloque = 0;
    bloque <
      CONFIG.diagramasPorFila;
    bloque++
  ) {

    const inicioBloque =
      1 +
      bloque *
      (
        anchoDiagrama +
        CONFIG.columnasSeparacion
      );


    /*
     * Columna de números.
     */
    hoja.setColumnWidth(
      inicioBloque,
      CONFIG.anchoCoordenada
    );


    /*
     * Ocho columnas del tablero.
     */
    for (
      let c = 1;
      c <= 8;
      c++
    ) {

      hoja.setColumnWidth(
        inicioBloque + c,
        CONFIG.tamanoCelda
      );
    }


    /*
     * Dos columnas separadoras.
     */
    if (
      bloque <
      CONFIG.diagramasPorFila - 1
    ) {

      const separador1 =
        inicioBloque +
        anchoDiagrama;

      const separador2 =
        separador1 + 1;


      hoja.setColumnWidth(
        separador1,
        CONFIG.anchoMitadSeparador
      );


      hoja.setColumnWidth(
        separador2,
        CONFIG.anchoMitadSeparador
      );
    }
  }


  /*
   * ==========================================================
   * ALTURAS DE FILA
   * ==========================================================
   */

  for (
    let bloque = 0;
    bloque <
      CONFIG.filasPorPagina;
    bloque++
  ) {

    const filaInicio =
      1 +
      bloque *
      (
        altoDiagrama +
        CONFIG.filasSeparacion
      );


    /*
     * Etiqueta.
     */
    hoja.setRowHeightsForced(
      filaInicio,
      1,
      CONFIG.altoEtiqueta
    );


    /*
     * Tablero.
     */
    hoja.setRowHeightsForced(
      filaInicio + 1,
      8,
      CONFIG.tamanoCelda
    );


    /*
     * Coordenadas inferiores.
     */
    hoja.setRowHeightsForced(
      filaInicio + 9,
      1,
      CONFIG.altoCoordenada
    );


    /*
     * Separación vertical.
     *
     * 4 px + 4 px.
     */
    if (
      bloque <
      CONFIG.filasPorPagina - 1
    ) {

      hoja.setRowHeightsForced(
        filaInicio + 10,
        1,
        CONFIG.altoMitadSeparador
      );


      hoja.setRowHeightsForced(
        filaInicio + 11,
        1,
        CONFIG.altoMitadSeparador
      );
    }
  }


  /*
   * ==========================================================
   * ALINEACIÓN GENERAL
   * ==========================================================
   */

  hoja
    .getRange(
      1,
      1,
      totalFilas,
      totalColumnas
    )
    .setHorizontalAlignment(
      'center'
    )
    .setVerticalAlignment(
      'middle'
    );


  /*
   * ==========================================================
   * GUÍAS DE CORTE
   * ==========================================================
   */

  dibujarGuiasCorte(
    hoja,
    totalFilas,
    totalColumnas
  );
}


/*
 * ============================================================
 * GUÍAS DE CORTE
 * ============================================================
 */

function dibujarGuiasCorte(
  hoja,
  totalFilas,
  totalColumnas
) {

  const anchoDiagrama =
    9;

  const altoDiagrama =
    10;


  /*
   * ==========================================================
   * GUÍAS VERTICALES
   * ==========================================================
   *
   * Tenemos dos columnas separadoras.
   * Dibujamos la línea justo entre ambas.
   */

  for (
    let bloque = 0;
    bloque <
      CONFIG.diagramasPorFila - 1;
    bloque++
  ) {

    const inicioBloque =
      1 +
      bloque *
      (
        anchoDiagrama +
        CONFIG.columnasSeparacion
      );


    const primeraColSeparador =
      inicioBloque +
      anchoDiagrama;


    hoja
      .getRange(
        1,
        primeraColSeparador,
        totalFilas,
        1
      )
      .setBorder(
        null,
        null,
        null,
        true,
        null,
        null,
        CONFIG.colorGuiaCorte,
        SpreadsheetApp.BorderStyle.DASHED
      );
  }


  /*
   * ==========================================================
   * GUÍAS HORIZONTALES
   * ==========================================================
   *
   * Tenemos dos filas separadoras.
   * Dibujamos la línea entre ambas.
   */

  for (
    let bloque = 0;
    bloque <
      CONFIG.filasPorPagina - 1;
    bloque++
  ) {

    const filaInicio =
      1 +
      bloque *
      (
        altoDiagrama +
        CONFIG.filasSeparacion
      );


    const primeraFilaSeparador =
      filaInicio +
      altoDiagrama;


    hoja
      .getRange(
        primeraFilaSeparador,
        1,
        1,
        totalColumnas
      )
      .setBorder(
        null,
        null,
        true,
        null,
        null,
        null,
        CONFIG.colorGuiaCorte,
        SpreadsheetApp.BorderStyle.DASHED
      );
  }
}


/*
 * ============================================================
 * DIBUJAR DIAGRAMA
 * ============================================================
 */

function dibujarDiagrama(
  hoja,
  posicion,
  indice
) {

  const bloqueCol =
    indice %
    CONFIG.diagramasPorFila;


  const bloqueFila =
    Math.floor(
      indice /
      CONFIG.diagramasPorFila
    );


  const anchoDiagrama =
    9;

  const altoDiagrama =
    10;


  const anchoBloque =
    anchoDiagrama +
    CONFIG.columnasSeparacion;


  const altoBloque =
    altoDiagrama +
    CONFIG.filasSeparacion;


  const colInicio =
    1 +
    bloqueCol *
      anchoBloque;


  const filaInicio =
    1 +
    bloqueFila *
      altoBloque;


  const colTablero =
    colInicio + 1;


  const filaTablero =
    filaInicio + 1;


  /*
   * ==========================================================
   * ETIQUETA
   * ==========================================================
   */

  const rangoEtiqueta =
    hoja.getRange(
      filaInicio,
      colInicio,
      1,
      9
    );


  rangoEtiqueta.merge();


  rangoEtiqueta
    .setValue(
      posicion.id
    )
    .setFontSize(
      CONFIG.tamanoFuenteEtiqueta
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      CONFIG.colorTexto
    )
    .setHorizontalAlignment(
      'center'
    )
    .setVerticalAlignment(
      'middle'
    );


  /*
   * ==========================================================
   * PARSEAR FEN
   * ==========================================================
   */

  let tablero;


  try {

    tablero =
      parsearFEN(
        posicion.fen
      );

  } catch (error) {

    rangoEtiqueta
      .setValue(
        `${posicion.id} · FEN inválida`
      )
      .setFontColor(
        '#B00020'
      );

    return;
  }


  /*
   * ==========================================================
   * ORIENTACIÓN
   * ==========================================================
   */

  const orientacion =
    posicion
      .orientacion
      .toLowerCase();


  const negrasAbajo =
    orientacion.startsWith(
      'n'
    );


  if (
    negrasAbajo
  ) {

    tablero =
      tablero
        .slice()
        .reverse()
        .map(
          fila =>
            fila
              .slice()
              .reverse()
        );
  }


  /*
   * ==========================================================
   * TABLERO
   * ==========================================================
   */

  const rangoTablero =
    hoja.getRange(
      filaTablero,
      colTablero,
      8,
      8
    );


  rangoTablero
    .clearContent()
    .setBackgrounds(
      crearMatrizColoresTablero()
    )
    .setHorizontalAlignment(
      'center'
    )
    .setVerticalAlignment(
      'middle'
    );


  /*
   * ==========================================================
   * COORDENADAS
   * ==========================================================
   */

  dibujarCoordenadas(
    hoja,
    posicion.coordenadas,
    negrasAbajo,
    filaTablero,
    colInicio,
    colTablero
  );


  /*
   * ==========================================================
   * PIEZAS
   * ==========================================================
   */

  for (
    let fila = 0;
    fila < 8;
    fila++
  ) {

    for (
      let columna = 0;
      columna < 8;
      columna++
    ) {

      const pieza =
        tablero[fila][columna];


      if (
        pieza !== ''
      ) {

        insertarPiezaEnCelda(
          hoja,
          pieza,
          filaTablero + fila,
          colTablero + columna
        );
      }
    }
  }


  /*
   * Borde sólido del tablero.
   */
  rangoTablero.setBorder(
    true,
    true,
    true,
    true,
    false,
    false
  );
}


/*
 * ============================================================
 * COORDENADAS
 * ============================================================
 */

function dibujarCoordenadas(
  hoja,
  mostrar,
  negrasAbajo,
  filaTablero,
  colCoordenadas,
  colTablero
) {

  const filaLetras =
    filaTablero + 8;


  hoja
    .getRange(
      filaTablero,
      colCoordenadas,
      8,
      1
    )
    .clearContent();


  hoja
    .getRange(
      filaLetras,
      colTablero,
      1,
      8
    )
    .clearContent();


  if (
    !mostrar
  ) {

    return;
  }


  const rangos =
    negrasAbajo
      ? [
          ['1'],
          ['2'],
          ['3'],
          ['4'],
          ['5'],
          ['6'],
          ['7'],
          ['8']
        ]
      : [
          ['8'],
          ['7'],
          ['6'],
          ['5'],
          ['4'],
          ['3'],
          ['2'],
          ['1']
        ];


  const archivos =
    negrasAbajo
      ? [[
          'h',
          'g',
          'f',
          'e',
          'd',
          'c',
          'b',
          'a'
        ]]
      : [[
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
          'g',
          'h'
        ]];


  hoja
    .getRange(
      filaTablero,
      colCoordenadas,
      8,
      1
    )
    .setValues(
      rangos
    )
    .setFontSize(
      CONFIG.tamanoFuenteCoordenada
    )
    .setFontColor(
      CONFIG.colorTexto
    )
    .setHorizontalAlignment(
      'right'
    )
    .setVerticalAlignment(
      'middle'
    );


hoja
  .getRange(
    filaLetras,
    colTablero,
    1,
    8
  )
  .setValues(
    archivos
  )
  .setFontSize(
    CONFIG.tamanoFuenteCoordenada
  )
  .setFontColor(
    CONFIG.colorTexto
  )
  .setHorizontalAlignment(
    'center'
  )
  .setVerticalAlignment(
    'middle'
  );
}


/*
 * ============================================================
 * MATRIZ DE COLORES
 * ============================================================
 */

function crearMatrizColoresTablero() {

  const fondos = [];


  for (
    let fila = 0;
    fila < 8;
    fila++
  ) {

    const filaColores = [];


    for (
      let columna = 0;
      columna < 8;
      columna++
    ) {

      const clara =
        (
          fila +
          columna
        ) % 2 === 0;


      filaColores.push(
        clara
          ? CONFIG.colorClaro
          : CONFIG.colorOscuro
      );
    }


    fondos.push(
      filaColores
    );
  }


  return fondos;
}


/*
 * ============================================================
 * CACHÉ DE BYTES
 * ============================================================
 */

function obtenerBytesPieza(
  pieza
) {

  if (
    CACHE_BYTES_PIEZAS[
      pieza
    ]
  ) {

    return CACHE_BYTES_PIEZAS[
      pieza
    ];
  }


  const base64 =
    PIEZAS[
      pieza
    ];


  if (
    !base64
  ) {

    throw new Error(
      `No existe imagen para la pieza "${pieza}".`
    );
  }


  const bytes =
    Utilities.base64Decode(
      base64
    );


  CACHE_BYTES_PIEZAS[
    pieza
  ] = bytes;


  return bytes;
}


/*
 * ============================================================
 * CREAR BLOB
 * ============================================================
 */

function crearBlobPieza(
  pieza
) {

  const bytes =
    obtenerBytesPieza(
      pieza
    );


  return Utilities.newBlob(
    bytes,
    'image/png',
    pieza + '.png'
  );
}


/*
 * ============================================================
 * INSERTAR PIEZA CON REINTENTOS
 * ============================================================
 */

function insertarPiezaEnCelda(
  hoja,
  pieza,
  fila,
  columna
) {

  const maxIntentos =
    3;


  let ultimoError =
    null;


  for (
    let intento = 1;
    intento <= maxIntentos;
    intento++
  ) {

    try {

      const blob =
        crearBlobPieza(
          pieza
        );


      const imagen =
        hoja.insertImage(
          blob,
          columna,
          fila
        );


      imagen
        .setWidth(
          CONFIG.tamanoPieza
        )
        .setHeight(
          CONFIG.tamanoPieza
        )
        .setAnchorCellXOffset(
          1
        )
        .setAnchorCellYOffset(
          1
        );


      return;


    } catch (error) {

      ultimoError =
        error;


      if (
        intento <
        maxIntentos
      ) {

        Utilities.sleep(
          500 * intento
        );
      }
    }
  }


  throw new Error(
    `No se pudo insertar la pieza "${pieza}" ` +
    `en fila ${fila}, columna ${columna} ` +
    `después de ${maxIntentos} intentos.\n\n` +
    (
      ultimoError
        ? ultimoError.message
        : ''
    )
  );
}


/*
 * ============================================================
 * GENERAR PLANCHA + PDF
 * ============================================================
 */

function generarPlanchaYPDF() {

  try {

    const resultado =
      generarPlanchaInterna();


    SpreadsheetApp.flush();


    Utilities.sleep(
      1500
    );


    const archivoPDF =
      exportarPDFInterno();


    SpreadsheetApp
      .getUi()
      .alert(
        'Proceso completado.\n\n' +
        `Diagramas: ${resultado.cantidad}\n` +
        `Páginas: ${resultado.paginas}\n\n` +
        `PDF: ${archivoPDF.getName()}`
      );

  } catch (error) {

    SpreadsheetApp
      .getUi()
      .alert(
        'Error:\n\n' +
        error.message
      );
  }
}


/*
 * ============================================================
 * EXPORTAR PDF
 * ============================================================
 */

function exportarPDF() {

  try {

    const archivoPDF =
      exportarPDFInterno();


    SpreadsheetApp
      .getUi()
      .alert(
        'PDF generado correctamente.\n\n' +
        archivoPDF.getName()
      );

  } catch (error) {

    SpreadsheetApp
      .getUi()
      .alert(
        'Error al exportar el PDF:\n\n' +
        error.message
      );
  }
}


/*
 * ============================================================
 * OBTENER HOJAS DE IMPRESIÓN
 * ============================================================
 */

function obtenerHojasImpresion(
  ss
) {

  const regex =
    new RegExp(
      '^' +
      CONFIG.prefijoHojaSalida +
      ' (\\d+)$'
    );


  const hojas =
    ss
      .getSheets()
      .filter(
        hoja =>
          regex.test(
            hoja.getName()
          )
      );


  hojas.sort(
    (a, b) => {

      const numeroA =
        Number(
          a
            .getName()
            .match(regex)[1]
        );


      const numeroB =
        Number(
          b
            .getName()
            .match(regex)[1]
        );


      return (
        numeroA -
        numeroB
      );
    }
  );


  return hojas;
}


/*
 * ============================================================
 * EXPORTACIÓN PDF MULTIPÁGINA
 * ============================================================
 */

function exportarPDFInterno() {

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const hojasImpresion =
    obtenerHojasImpresion(
      ss
    );


  if (
    hojasImpresion.length === 0
  ) {

    throw new Error(
      'No existen hojas de impresión. Genera primero la plancha.'
    );
  }


  const hojaActivaOriginal =
    ss.getActiveSheet();


  ss.setActiveSheet(
    hojasImpresion[0]
  );


  const idsImpresion =
    new Set(
      hojasImpresion.map(
        hoja =>
          hoja.getSheetId()
      )
    );


  const hojasOcultadasTemporalmente =
    [];


  let archivoPDF;


  try {

    ss
      .getSheets()
      .forEach(
        hoja => {

          if (
            !idsImpresion.has(
              hoja.getSheetId()
            ) &&
            !hoja.isSheetHidden()
          ) {

            hoja.hideSheet();

            hojasOcultadasTemporalmente.push(
              hoja
            );
          }
        }
      );


    SpreadsheetApp.flush();


    Utilities.sleep(
      750
    );


    /*
     * ========================================================
     * PDF CARTA
     * ========================================================
     *
     * scale=4 = ajustar hoja completa a una página.
     *
     * Reducimos especialmente los márgenes superior
     * e inferior.
     */
    const parametros = [

      'format=pdf',

      'size=letter',

      'portrait=true',

      'scale=4',

      'sheetnames=false',

      'printtitle=false',

      'pagenumbers=false',

      'gridlines=false',

      'fzr=false',

      /*
       * Márgenes reducidos.
       */
      'top_margin=0.12',

      'bottom_margin=0.12',

      'left_margin=0.20',

      'right_margin=0.20'
    ];


    const url =
      'https://docs.google.com/spreadsheets/d/' +
      ss.getId() +
      '/export?' +
      parametros.join('&');


    const token =
      ScriptApp
        .getOAuthToken();


    const respuesta =
      UrlFetchApp.fetch(
        url,
        {

          headers: {

            Authorization:
              'Bearer ' +
              token
          },

          muteHttpExceptions:
            true
        }
      );


    const codigo =
      respuesta
        .getResponseCode();


    if (
      codigo !== 200
    ) {

      throw new Error(
        `Google devolvió el código ${codigo} al generar el PDF.`
      );
    }


    const nombreArchivo =
      `Plancha_Ajedrez_${
        Utilities.formatDate(
          new Date(),
          Session.getScriptTimeZone(),
          'yyyy-MM-dd_HHmm'
        )
      }.pdf`;


    const blob =
      respuesta
        .getBlob()
        .setName(
          nombreArchivo
        );


    const archivoSpreadsheet =
      DriveApp.getFileById(
        ss.getId()
      );


    const padres =
      archivoSpreadsheet
        .getParents();


    if (
      padres.hasNext()
    ) {

      const carpeta =
        padres.next();


      archivoPDF =
        carpeta.createFile(
          blob
        );

    } else {

      archivoPDF =
        DriveApp.createFile(
          blob
        );
    }


  } finally {

    hojasOcultadasTemporalmente.forEach(
      hoja => {

        hoja.showSheet();
      }
    );


    if (
      hojaActivaOriginal
    ) {

      try {

        ss.setActiveSheet(
          hojaActivaOriginal
        );

      } catch (e) {

        ss.setActiveSheet(
          hojasImpresion[0]
        );
      }
    }


    SpreadsheetApp.flush();
  }


  return archivoPDF;
}
