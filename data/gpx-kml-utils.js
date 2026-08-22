/**
 * Utility functions for exporting and importing GPX and KML files
 * for handheld GPS devices (Garmin) and mobile navigation apps (OsmAnd, Locus Map).
 */

window.GPX_KML_UTILS = {
  /**
   * Export array of point objects to GPX format and trigger file download
   * @param {Array} points Array of point objects
   * @param {String} filename Output file name
   */
  exportToGPX: function(points, filename = "grodno_expedition_points.gpx") {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<gpx version="1.1" creator="Grodno WWII Web-GIS Search Platform" xmlns="http://www.topografix.com/GPX/1/1">\n`;
    xml += `  <metadata>\n`;
    xml += `    <name>Экспедиция Гродненский район - Поисковые объекты</name>\n`;
    xml += `    <desc>Точки официальных мемориалов и перспективных неучтенных захоронений Великой Отечественной войны</desc>\n`;
    xml += `    <time>${new Date().toISOString()}</time>\n`;
    xml += `  </metadata>\n`;

    points.forEach(pt => {
      xml += `  <wpt lat="${pt.lat}" lon="${pt.lng}">\n`;
      xml += `    <name>${this.escapeXML(pt.code || pt.id)}: ${this.escapeXML(pt.name)}</name>\n`;
      xml += `    <desc>Категория: ${this.escapeXML(pt.category || "Объект")} | Период: ${this.escapeXML(pt.period || "1941-1944")} | Воинское подразделение: ${this.escapeXML(pt.unit || "Н/Д")}\nОписание: ${this.escapeXML(pt.description || "")}\nРекомендации: ${this.escapeXML(pt.recommendation || "")}</desc>\n`;
      xml += `    <sym>${pt.category === 'official_memorial' ? 'Flag, Red' : 'Waypoint'}</sym>\n`;
      xml += `    <type>${this.escapeXML(pt.category || 'SearchPoint')}</type>\n`;
      xml += `  </wpt>\n`;
    });

    xml += `</gpx>`;

    this.downloadFile(xml, filename, "application/gpx+xml");
  },

  /**
   * Export array of point objects to KML format (Google Earth, OsmAnd)
   * @param {Array} points Array of point objects
   * @param {String} filename Output file name
   */
  exportToKML: function(points, filename = "grodno_expedition_points.kml") {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    kml += `<kml xmlns="http://www.opengis.net/kml/2.2">\n`;
    kml += `  <Document>\n`;
    kml += `    <name>Гродненская Поисковая Экспедиция - Картотека Точек</name>\n`;
    kml += `    <description>Геоинформационная система поиска неучтенных захоронений 1941/1944</description>\n`;

    // Define Styles
    kml += `    <Style id="official_memorial">\n`;
    kml += `      <IconStyle><color>ff0000ff</color><scale>1.2</scale></IconStyle>\n`;
    kml += `    </Style>\n`;
    kml += `    <Style id="prospective_burial">\n`;
    kml += `      <IconStyle><color>ff00a5ff</color><scale>1.2</scale></IconStyle>\n`;
    kml += `    </Style>\n`;
    kml += `    <Style id="san_burial">\n`;
    kml += `      <IconStyle><color>ff0080ff</color><scale>1.1</scale></IconStyle>\n`;
    kml += `    </Style>\n`;
    kml += `    <Style id="default_style">\n`;
    kml += `      <IconStyle><color>ff00ff00</color><scale>1.0</scale></IconStyle>\n`;
    kml += `    </Style>\n`;

    points.forEach(pt => {
      let styleId = pt.category || "default_style";
      kml += `    <Placemark>\n`;
      kml += `      <name>${this.escapeXML(pt.name)} [${this.escapeXML(pt.code || pt.id)}]</name>\n`;
      kml += `      <description><![CDATA[\n`;
      kml += `        <b>Категория:</b> ${pt.category}<br/>\n`;
      kml += `        <b>Подразделение:</b> ${pt.unit || "Н/Д"}<br/>\n`;
      kml += `        <b>Оценка глубины:</b> ${pt.depthEstimate || "Н/Д"}<br/>\n`;
      kml += `        <b>Потери:</b> ${pt.estimatedCasualties || "Н/Д"}<br/>\n`;
      kml += `        <b>Описание:</b> ${pt.description || ""}<br/>\n`;
      kml += `        <b>Рекомендации:</b> ${pt.recommendation || ""}\n`;
      kml += `      ]]></description>\n`;
      kml += `      <styleUrl>#${styleId}</styleUrl>\n`;
      kml += `      <Point>\n`;
      kml += `        <coordinates>${pt.lng},${pt.lat},0</coordinates>\n`;
      kml += `      </Point>\n`;
      kml += `    </Placemark>\n`;
    });

    kml += `  </Document>\n`;
    kml += `</kml>`;

    this.downloadFile(kml, filename, "application/vnd.google-earth.kml+xml");
  },

  /**
   * Parse GPX string into point objects
   * @param {String} gpxText 
   * @returns {Array} Array of parsed points
   */
  parseGPX: function(gpxText) {
    let parsedPoints = [];
    try {
      let parser = new DOMParser();
      let xmlDoc = parser.parseFromString(gpxText, "text/xml");
      let wpts = xmlDoc.getElementsByTagName("wpt");

      for (let i = 0; i < wpts.length; i++) {
        let wpt = wpts[i];
        let lat = parseFloat(wpt.getAttribute("lat"));
        let lng = parseFloat(wpt.getAttribute("lon"));
        let nameEl = wpt.getElementsByTagName("name")[0];
        let descEl = wpt.getElementsByTagName("desc")[0];

        if (!isNaN(lat) && !isNaN(lng)) {
          parsedPoints.push({
            id: "user-gpx-" + Date.now() + "-" + i,
            code: "GPX-IMP-" + (i + 1),
            name: nameEl ? nameEl.textContent : "Импортированная точка #" + (i + 1),
            lat: lat,
            lng: lng,
            category: "field_finding",
            period: "1941/1944",
            unit: "Импорт GPX",
            depthEstimate: "0.5 - 1.0 м",
            estimatedCasualties: "Н/Д",
            status: "Импортировано из GPS",
            description: descEl ? descEl.textContent : "Точка загружена из пользовательского файла GPX",
            recommendation: "Проверить на месте экспедиции.",
            isUserCreated: true
          });
        }
      }
    } catch (e) {
      console.error("Ошибка парсинга GPX файла:", e);
    }
    return parsedPoints;
  },

  escapeXML: function(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  },

  downloadFile: function(content, filename, contentType) {
    let blob = new Blob([content], { type: contentType });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
};
