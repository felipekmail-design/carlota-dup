// ================================================
// CARLOTA DUP — HEALTHKIT (métricas diárias)
// ================================================
// Campos: date · hrv · restingHR · activeCalories · steps · syncedAt
// Composição corporal (bodyMass/fatPercentage/leanMass) →
//   vai para fk_bodycomp via saveBodyCompData com data real da aferição

function saveHealthKitData(ss, profile, params) {
  const sheet = getOrCreateSheet(ss, profile + '_healthkit');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['date', 'hrv', 'restingHR', 'activeCalories', 'steps', 'syncedAt']);
    sheet.setFrozenRows(1);
  }
  const today    = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const syncedAt = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'HH:mm');

  const newHrv      = parseNum(params.hrv);
  const newRhr      = parseNum(params.restingHR);
  const newCal      = parseNum(params.activeCalories);
  const newSteps    = parseNum(params.steps);

  // Busca registro existente para hoje, se houver
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const dateCol = headers.indexOf('date');
  const calCol  = headers.indexOf('activeCalories');
  const stCol   = headers.indexOf('steps');

  let existingRow = -1;
  let existingCal = 0;
  let existingSteps = 0;

  for (let i = 1; i < data.length; i++) {
    const raw = data[i][dateCol];
    const rowDate = (raw instanceof Date)
      ? Utilities.formatDate(raw, 'America/Sao_Paulo', 'yyyy-MM-dd')
      : String(raw).substring(0, 10);
    if (rowDate === today) {
      existingRow   = i + 1; // linha no sheet (1-indexed)
      existingCal   = parseNum(data[i][calCol]);
      existingSteps = parseNum(data[i][stCol]);
      break;
    }
  }

  // HRV e FC repouso: sobrescreve com o mais recente (leitura da manhã/noite é a válida)
  // Calorias e passos: preserva o MAIOR valor — o dia só acumula, nunca decresce
  // syncedAt: sempre atualiza com o horário da última execução do Atalho
  const finalCal   = Math.max(newCal,   existingCal);
  const finalSteps = Math.max(newSteps, existingSteps);

  const row = [today, newHrv, newRhr, finalCal, finalSteps, syncedAt];

  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return { ok: true, saved: {
    date:      today,
    hrv:       row[1],
    restingHR: row[2],
    activeCalories: row[3],
    steps:     row[4],
    syncedAt:  row[5]
  }};
}

// ── BATCH: salva array de registros (últimos N dias) ─────────────────────────
// Payload esperado: { action:"saveHealthKitBatch", profile:"fk", records:[...] }
// Cada record: { date:"yyyy-MM-dd", hrv, restingHR, activeCalories, steps }
function saveHealthKitBatch(ss, profile, records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { ok: false, error: 'records deve ser um array não vazio' };
  }

  const sheet = getOrCreateSheet(ss, profile + '_healthkit');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['date', 'hrv', 'restingHR', 'activeCalories', 'steps']);
    sheet.setFrozenRows(1);
  }

  const today = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
  const saved = [];
  const errors = [];

  records.forEach(function(rec) {
    try {
      const dateVal = String(rec.date || '').substring(0, 10);
      if (!dateVal || dateVal.length < 10) { errors.push('data inválida: ' + rec.date); return; }

      const newHrv   = parseNum(rec.hrv);
      const newRhr   = parseNum(rec.restingHR);
      const newCal   = parseNum(rec.activeCalories);
      const newSteps = parseNum(rec.steps);

      // Lê estado atual do sheet para aplicar lógica de máximo
      const data    = sheet.getDataRange().getValues();
      const headers = data[0];
      const dateCol = headers.indexOf('date');
      const calCol  = headers.indexOf('activeCalories');
      const stCol   = headers.indexOf('steps');

      let existingRowIdx = -1;
      let existingCal    = 0;
      let existingSteps  = 0;

      for (let i = 1; i < data.length; i++) {
        const raw     = data[i][dateCol];
        const rowDate = (raw instanceof Date)
          ? Utilities.formatDate(raw, 'America/Sao_Paulo', 'yyyy-MM-dd')
          : String(raw).substring(0, 10);
        if (rowDate === dateVal) {
          existingRowIdx = i + 1;
          existingCal    = parseNum(data[i][calCol]);
          existingSteps  = parseNum(data[i][stCol]);
          break;
        }
      }

      // HRV e FC: sobrescreve com mais recente
      // Calorias e passos: preserva o maior valor já registrado
      const finalCal   = Math.max(newCal,   existingCal);
      const finalSteps = Math.max(newSteps, existingSteps);
      const row = [dateVal, newHrv, newRhr, finalCal, finalSteps];

      if (existingRowIdx > 0) {
        sheet.getRange(existingRowIdx, 1, 1, row.length).setValues([row]);
      } else {
        sheet.appendRow(row);
      }

      saved.push({ date: dateVal, hrv: newHrv, restingHR: newRhr, activeCalories: finalCal, steps: finalSteps });
    } catch(e) {
      errors.push(rec.date + ': ' + e.toString());
    }
  });

  return { ok: true, saved: saved.length, errors: errors };
}

function listHealthKitData(ss, profile) {
  const sheet = getOrCreateSheet(ss, profile + '_healthkit');
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return { ok: true, data: [] };
  const headers = data[0];
  // Retorna últimos 14 dias, mais recente primeiro
  const rows = data.slice(1).slice(-14).reverse().map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return { ok: true, data: rows };
}
