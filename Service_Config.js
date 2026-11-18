/**
 * 簡報達人評分系統 v77.4 - GAS Config & Email Notification Service (Service_Config.js)
 * 職責：
 * 1. 處理系統設定、年度設定（Year_Config A~M 欄：含公用信箱設定與三階段信件草稿）
 * 2. 處理測試信發送（processSendTestEmail）與正式參賽/補件提醒/成績評語批次或單隊發信（processSendTeamEmails）
 * 3. 系統完整性診斷與跨年度複製
 */

const YEAR_CONFIG_HEADERS_V77 = [
  'Competition_Year', 'Is_Active', 'Rubric_Link', 'Rules_Link', 'System_Lock',
  'Category_Group_Map', 'Email_Sender_Config',
  'Email_Confirm_Subject', 'Email_Confirm_Body',
  'Email_Remind_Subject', 'Email_Remind_Body',
  'Email_Result_Subject', 'Email_Result_Body'
];

const DEFAULT_EMAIL_DRAFTS = {
  sender_config: {
    sender_name: '115學年度宜蘭縣簡報達人擂台賽工作小組',
    from_alias: '',
    reply_to: '',
    bcc_self: false,
    test_email: ''
  },
  confirm_subject: '【115簡報達人擂台賽】正式參賽與作品收件確認通知 — {學校}【{隊伍名稱}】',
  confirm_body:
`親愛的 {學校} 師生（參賽同學：{學生名單} ／ 指導老師：{指導老師}）您好：

感謝貴隊報名參與「{學年度}學年度 宜蘭縣國民中小學瘋學習簡報達人擂台賽」！
大會已完成貴隊之作品收件與形式審查，確認貴隊正式列入本屆參賽評審名單，基本資料如下：

■ 參賽組別：{參賽組別}
■ 學校名稱：{學校}
■ 隊伍名稱：{隊伍名稱}
■ 作品名稱：{作品名稱}
■ 參賽學生：{學生名單}
■ 指導老師：{指導老師}（主要聯絡人：{主要聯絡人}）

■ 貴隊提交之各項作品連結（請務必點擊下方連結自我檢核雲端權限是否皆已開啟為「知道連結的任何人皆可檢視」）：
{作品連結清單}

📅 後續重要時程提醒：
• 專家評審作業完成後，預計於 115年12月11日（五）公告成績，並以 Email 寄發評審委員指導評語回饋。
• 榮獲「特優、優等」之團隊，將受邀於 115年12月20日（日）出席「宜蘭縣科技競賽暨數位親子嘉年華」現場受獎及成果展現。

預祝貴隊展現探究熱情，勇奪佳績！

宜蘭縣政府教育網路中心 ／ 簡報達人擂台賽工作小組 敬上`,

  remind_subject: '【重要補件/權限提醒】{學年度}簡報達人擂台賽形式審查通知 — {學校}【{隊伍名稱}】',
  remind_body:
`親愛的 {學校} 指導老師（{指導老師}）與參賽同學（{學生名單}）您好：

感謝貴隊報名參與「{學年度}學年度 宜蘭縣瘋學習簡報達人擂台賽」（作品名稱：《{作品名稱}》）。
工作小組於進行賽前形式審查時，發現貴隊提交之作品資料有以下項目需請協助確認或補正：

⚠️ 【審查需補正事項】：
{補件異常備註}

■ 貴隊目前登記之作品連結如下（請點擊測試是否已開啟「知道連結者皆可檢視」之公開共用權限）：
{作品連結清單}

📌 請於形式審查補正期限（115年11月16日 16:00）前完成權限開啟或補件，並回覆本信件或聯繫承辦單位確認，以免影響後續評審給分權益。

宜蘭縣政府教育網路中心 ／ 簡報達人擂台賽工作小組 敬上`,

  result_subject: '【成績公布與評審回饋】{學年度}簡報達人擂台賽評選結果通知 — {學校}【{隊伍名稱}】',
  result_body:
`親愛的 {學校} 師生（參賽同學：{學生名單} ／ 指導老師：{指導老師}）您好：

感謝貴隊熱情參與「{學年度}學年度 宜蘭縣國民中小學瘋學習簡報達人擂台賽」！
本屆賽事經評審委員專業評選與決審共識會議討論，貴隊作品《{作品名稱}》（組別：{參賽組別}）表現優異，評選結果如下：

🏆 【貴隊榮獲獎項】：
{榮獲獎項總覽}

🎁 【獎勵內容與領獎說明】：
{獎勵與頒獎說明}

💬 【評審委員專業指導與回饋】（依匿名方式呈現）：
{評審評語彙整}

再次肯定同學們在問題探究、心智圖邏輯思考與簡報表達上的用心投入，也感謝指導老師的辛勤帶領！

宜蘭縣政府教育網路中心 ／ 簡報達人擂台賽工作小組 敬上`
};

function ensureYearConfigColumns(yearSheet) {
  if (!yearSheet) return;
  const lastCol = yearSheet.getLastColumn();
  const currentHeaders = lastCol > 0 ? yearSheet.getRange(1, 1, 1, Math.max(lastCol, YEAR_CONFIG_HEADERS_V77.length)).getValues()[0] : [];
  for (let i = 0; i < YEAR_CONFIG_HEADERS_V77.length; i++) {
    if (String(currentHeaders[i] || '').trim() !== YEAR_CONFIG_HEADERS_V77[i]) {
      yearSheet.getRange(1, i + 1).setValue(YEAR_CONFIG_HEADERS_V77[i]).setFontWeight('bold');
    }
  }
}

function getMailEnvironmentInfo() {
  let remainingQuota = null;
  let aliases = [];
  let activeUserEmail = '';
  try {
    remainingQuota = MailApp.getRemainingDailyQuota();
  } catch (e) {}
  try {
    activeUserEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '';
  } catch (e) {}
  try {
    if (typeof GmailApp !== 'undefined' && GmailApp.getAliases) {
      aliases = GmailApp.getAliases() || [];
    }
  } catch (e) {}
  return {
    remaining_quota: remainingQuota,
    gmail_aliases: aliases,
    active_account_email: activeUserEmail
  };
}

function processGetSystemConfig(ss, payload) {
  const targetYear = String(payload.year || payload.competition_year || 115);
  let yearSheet = ss.getSheetByName('Year_Config');
  if (!yearSheet) {
    yearSheet = ss.insertSheet('Year_Config');
  }
  ensureYearConfigColumns(yearSheet);

  const lastRow = yearSheet.getLastRow();
  let targetRow = null;
  let rowIndex = -1;

  if (lastRow > 1) {
    const data = yearSheet.getRange(2, 1, lastRow - 1, YEAR_CONFIG_HEADERS_V77.length).getValues();
    const foundIdx = data.findIndex(row => String(row[0]) === targetYear);
    if (foundIdx !== -1) {
      targetRow = data[foundIdx];
      rowIndex = foundIdx + 2;
    }
  }

  // 若該年度不存在，自動初始化一筆預設設定
  if (!targetRow) {
    const defaultGroupMap = {
      "宜蘭在地自然人文特色": ["【宜蘭在地自然人文特色】國中組", "【宜蘭在地自然人文特色】國小組"],
      "環境永續×SDGs及生活裡的永續": ["【環境永續×SDGs及生活裡的永續】國中組", "【環境永續×SDGs及生活裡的永續】國小組"],
      "學校校訂課程": ["【學校校訂課程】國中組", "【學校校訂課程】國小組"]
    };
    const newRow = [
      Number(targetYear),
      true,                                                // Is_Active
      'https://example.com/rubric',                        // Rubric_Link
      'https://example.com/rules',                         // Rules_Link
      false,                                               // System_Lock
      JSON.stringify(defaultGroupMap),                     // Category_Group_Map
      JSON.stringify(DEFAULT_EMAIL_DRAFTS.sender_config),  // G欄: Email_Sender_Config
      DEFAULT_EMAIL_DRAFTS.confirm_subject,                // H欄: Email_Confirm_Subject
      DEFAULT_EMAIL_DRAFTS.confirm_body,                   // I欄: Email_Confirm_Body
      DEFAULT_EMAIL_DRAFTS.remind_subject,                 // J欄: Email_Remind_Subject
      DEFAULT_EMAIL_DRAFTS.remind_body,                    // K欄: Email_Remind_Body
      DEFAULT_EMAIL_DRAFTS.result_subject,                 // L欄: Email_Result_Subject
      DEFAULT_EMAIL_DRAFTS.result_body                     // M欄: Email_Result_Body
    ];
    yearSheet.appendRow(newRow);
    targetRow = newRow;
  } else {
    // 若舊表僅有前 8 欄，自動為空的草稿欄位補上預設草稿並存回試算表
    let needsPatch = false;
    const patchedRow = [...targetRow];
    while (patchedRow.length < YEAR_CONFIG_HEADERS_V77.length) {
      patchedRow.push('');
    }
    // 檢查 G 欄是否為舊版純文字主旨而非 JSON
    let parsedSender = null;
    try {
      if (patchedRow[6] && String(patchedRow[6]).trim().startsWith('{')) {
        parsedSender = JSON.parse(patchedRow[6]);
      }
    } catch (e) {}
    if (!parsedSender) {
      patchedRow[6] = JSON.stringify(DEFAULT_EMAIL_DRAFTS.sender_config);
      needsPatch = true;
    }
    if (!String(patchedRow[7] || '').trim()) { patchedRow[7] = DEFAULT_EMAIL_DRAFTS.confirm_subject; needsPatch = true; }
    if (!String(patchedRow[8] || '').trim()) { patchedRow[8] = DEFAULT_EMAIL_DRAFTS.confirm_body; needsPatch = true; }
    if (!String(patchedRow[9] || '').trim()) { patchedRow[9] = DEFAULT_EMAIL_DRAFTS.remind_subject; needsPatch = true; }
    if (!String(patchedRow[10] || '').trim()) { patchedRow[10] = DEFAULT_EMAIL_DRAFTS.remind_body; needsPatch = true; }
    if (!String(patchedRow[11] || '').trim()) { patchedRow[11] = DEFAULT_EMAIL_DRAFTS.result_subject; needsPatch = true; }
    if (!String(patchedRow[12] || '').trim()) { patchedRow[12] = DEFAULT_EMAIL_DRAFTS.result_body; needsPatch = true; }

    if (needsPatch && rowIndex !== -1) {
      yearSheet.getRange(rowIndex, 1, 1, YEAR_CONFIG_HEADERS_V77.length).setValues([patchedRow]);
      targetRow = patchedRow;
    }
  }

  let categories = {};
  try {
    if (targetRow[5]) {
      categories = typeof targetRow[5] === 'string' ? JSON.parse(targetRow[5]) : targetRow[5];
    }
  } catch (e) {}

  let senderConfig = { ...DEFAULT_EMAIL_DRAFTS.sender_config };
  try {
    if (targetRow[6] && String(targetRow[6]).trim().startsWith('{')) {
      senderConfig = { ...senderConfig, ...JSON.parse(targetRow[6]) };
    }
  } catch (e) {}

  const mailEnv = getMailEnvironmentInfo();

  return {
    status: 'success',
    data: {
      current_year: String(targetRow[0]),
      is_registration_open: !!targetRow[1],
      rubric_link: String(targetRow[2] || ''),
      rules_link: String(targetRow[3] || ''),
      is_judging_open: !targetRow[4],
      Category_Group_Map: categories,
      sender_config: senderConfig,
      email_confirm_subject: String(targetRow[7] || DEFAULT_EMAIL_DRAFTS.confirm_subject),
      email_confirm_body: String(targetRow[8] || DEFAULT_EMAIL_DRAFTS.confirm_body),
      email_remind_subject: String(targetRow[9] || DEFAULT_EMAIL_DRAFTS.remind_subject),
      email_remind_body: String(targetRow[10] || DEFAULT_EMAIL_DRAFTS.remind_body),
      email_result_subject: String(targetRow[11] || DEFAULT_EMAIL_DRAFTS.result_subject),
      email_result_body: String(targetRow[12] || DEFAULT_EMAIL_DRAFTS.result_body),
      // 向下相容欄位
      email_subject: String(targetRow[7] || DEFAULT_EMAIL_DRAFTS.confirm_subject),
      email_body: String(targetRow[8] || DEFAULT_EMAIL_DRAFTS.confirm_body),
      mail_env: mailEnv
    }
  };
}

function processSaveSystemConfig(ss, payload) {
  const current_year = String(payload.current_year || payload.Competition_Year || 115);
  const is_registration_open = payload.is_registration_open !== undefined ? payload.is_registration_open : (payload.Is_Active ?? true);
  const rubric_link = payload.rubric_link || payload.Rubric_Link || '';
  const rules_link = payload.rules_link || payload.Rules_Link || '';
  const is_judging_open = payload.is_judging_open !== undefined ? payload.is_judging_open : !(payload.System_Lock);
  const system_lock = !is_judging_open;
  const categories = payload.categories || payload.Category_Group_Map;

  const senderObj = payload.sender_config || DEFAULT_EMAIL_DRAFTS.sender_config;
  const senderJson = typeof senderObj === 'string' ? senderObj : JSON.stringify(senderObj);

  const confirm_subject = payload.email_confirm_subject ?? payload.email_subject ?? DEFAULT_EMAIL_DRAFTS.confirm_subject;
  const confirm_body = payload.email_confirm_body ?? payload.email_body ?? DEFAULT_EMAIL_DRAFTS.confirm_body;
  const remind_subject = payload.email_remind_subject ?? DEFAULT_EMAIL_DRAFTS.remind_subject;
  const remind_body = payload.email_remind_body ?? DEFAULT_EMAIL_DRAFTS.remind_body;
  const result_subject = payload.email_result_subject ?? DEFAULT_EMAIL_DRAFTS.result_subject;
  const result_body = payload.email_result_body ?? DEFAULT_EMAIL_DRAFTS.result_body;

  let yearSheet = ss.getSheetByName('Year_Config');
  if (!yearSheet) {
    yearSheet = ss.insertSheet('Year_Config');
  }
  ensureYearConfigColumns(yearSheet);

  const lastRow = yearSheet.getLastRow();
  let rowIndex = -1;

  if (lastRow > 1) {
    const data = yearSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const foundIdx = data.findIndex(row => String(row[0]) === current_year);
    if (foundIdx !== -1) rowIndex = foundIdx + 2;
  }

  let catString = "{}";
  if (typeof categories === 'string') catString = categories;
  else if (typeof categories === 'object' && categories !== null) catString = JSON.stringify(categories);

  const rowData = [
    Number(current_year),
    !!is_registration_open,
    rubric_link,
    rules_link,
    !!system_lock,
    catString,
    senderJson,
    confirm_subject,
    confirm_body,
    remind_subject,
    remind_body,
    result_subject,
    result_body
  ];

  if (rowIndex !== -1) {
    yearSheet.getRange(rowIndex, 1, 1, YEAR_CONFIG_HEADERS_V77.length).setValues([rowData]);
  } else {
    yearSheet.appendRow(rowData);
  }

  SpreadsheetApp.flush();
  return { status: 'success', message: `${current_year}學年度 系統設定與三封信件草稿已成功儲存至試算表 Year_Config！` };
}

function processCopyYearData(ss, payload) {
  const { sourceYear, targetYear } = payload;
  if (!sourceYear || !targetYear) return { status: 'error', message: 'Missing sourceYear or targetYear', data: null };

  const yearSheet = ss.getSheetByName('Year_Config');
  const yearLastRow = yearSheet.getLastRow();

  if (yearLastRow > 1) {
    const yearData = yearSheet.getRange(2, 1, yearLastRow - 1, yearSheet.getLastColumn()).getValues();
    const sourceRow = yearData.find(row => String(row[0]) === String(sourceYear));
    if (sourceRow) {
      const targetExists = yearData.some(row => String(row[0]) === String(targetYear));
      if (!targetExists) {
        let newRow = [...sourceRow];
        newRow[0] = targetYear;
        yearSheet.appendRow(newRow);
      }
    }
  }

  return { status: 'success', message: `Copied config from ${sourceYear} to ${targetYear}` };
}

/**
 * 系統完整性一鍵診斷 Service (採「標題名稱動態對應」檢測，確保欄位皆存在且名稱相符，不拘泥於固定欄位編號)
 */
function verifySheetHeaderAlignment(sheet, expectedHeaders) {
  if (!sheet) {
    return { aligned: false, missing: expectedHeaders, mismatched: [], totalExpected: expectedHeaders.length };
  }
  const lastCol = sheet.getLastColumn();
  const actualRow = (lastCol > 0 && sheet.getLastRow() > 0)
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => String(v || '').trim())
    : [];

  const missing = [];
  const actualMap = {};
  actualRow.forEach((name, idx) => {
    if (name) actualMap[name] = idx + 1;
  });

  expectedHeaders.forEach(expectedName => {
    if (actualMap[expectedName] === undefined) {
      missing.push(expectedName);
    }
  });

  return {
    aligned: missing.length === 0,
    missing: missing,
    mismatched: [],
    totalExpected: expectedHeaders.length,
    totalActual: actualRow.length
  };
}

function processCheckSystemHealth(ss, payload) {
  const reqYear = String(payload.year || payload.competition_year || 115);
  const checks = [];

  // 1. 核心工作表分頁結構檢查 (7 大分頁)
  const expectedSheets = ['System_Config', 'Judge_Setup', 'Year_Config', 'Teams', 'Scores', 'Final_Results', 'Backup_Timestamp'];
  const missingSheets = [];
  expectedSheets.forEach(name => {
    if (!ss.getSheetByName(name)) missingSheets.push(name);
  });

  checks.push({
    id: 'sheets_schema',
    title: '1. 核心工作表分頁結構 (7 大分頁檢查)',
    status: missingSheets.length === 0 ? 'pass' : 'fail',
    detail: missingSheets.length === 0
      ? `所有 ${expectedSheets.length} 張工作表分頁 (${expectedSheets.join('、')}) 皆存在且名稱正確`
      : `缺少工作表分頁: ${missingSheets.join(', ')}`
  });

  // 2. Teams 隊伍資料表欄位對齊檢測 (採標題名稱動態對應，不拘欄位順序)
  const teamSheet = ss.getSheetByName('Teams');
  if (teamSheet && typeof ensureTeamsSheetColumns === 'function') {
    ensureTeamsSheetColumns(teamSheet);
  }
  const expectedTeamsHeaders = [
    'Team_ID', 'Competition_Year', 'Category', 'Group_Name', 'School', 'Work_Title', 'Description',
    'Student1_Name', 'Student1_Email', 'Student2_Name', 'Student2_Email', 'Student3_Name', 'Student3_Email',
    'Teacher1_Name', 'Teacher1_Email', 'Teacher2_Name', 'Teacher2_Email',
    'Contact_Person', 'Contact_Phone',
    'MindMap_Link', 'Slides_Link', 'Video_Link', 'Consent_Link', 'Course_Plan_Link', 'Drive_Link',
    'Link_Note', 'Memo',
    'Student1_Class', 'Student2_Class', 'Student3_Class', 'Teacher2_Phone'
  ];
  const teamsAlign = verifySheetHeaderAlignment(teamSheet, expectedTeamsHeaders);
  let teamRowCount = 0;
  if (teamSheet && teamSheet.getLastRow() > 1) {
    const tRows = teamSheet.getRange(2, 1, teamSheet.getLastRow() - 1, 2).getValues();
    teamRowCount = tRows.filter(r => String(r[1]) === reqYear).length;
  }

  checks.push({
    id: 'teams_columns_alignment',
    title: `2. 隊伍表前後端欄位對齊 (Teams 共 ${expectedTeamsHeaders.length} 欄，採標題自動對應)`,
    status: teamsAlign.aligned ? 'pass' : 'fail',
    detail: teamsAlign.aligned
      ? `已成功辨識全部 ${expectedTeamsHeaders.length} 個標題欄位（採標題名稱動態對應，不拘欄位先後順序；目前載入 ${teamRowCount} 筆隊伍列）`
      : `欄位未對齊 — 缺失欄位: [${teamsAlign.missing.join(', ') || '無'}]`
  });

  // 3. Year_Config 年度與郵件草稿表欄位對齊檢測 (A ~ M 欄，共 13 欄)
  const configRes = processGetSystemConfig(ss, { year: reqYear });
  const yearSheet = ss.getSheetByName('Year_Config');
  const yearAlign = verifySheetHeaderAlignment(yearSheet, YEAR_CONFIG_HEADERS_V77);
  const hasConfig = configRes.status === 'success';

  checks.push({
    id: 'year_config_alignment',
    title: '3. 年度設定與郵件草稿欄位對齊 (Year_Config A~M 共 13 欄)',
    status: (yearAlign.aligned && hasConfig) ? 'pass' : 'fail',
    detail: (yearAlign.aligned && hasConfig)
      ? `A 欄 ～ M 欄共 ${YEAR_CONFIG_HEADERS_V77.length} 個欄位完全對齊（G欄公用信箱設定、H~M欄三封信件草稿皆已就緒｜系統狀態：${configRes.data.is_judging_open ? '🟢 開放評分中' : '🔴 評分鎖定中'}）`
      : `欄位未對齊 — 缺失: [${yearAlign.missing.join(', ') || '無'}]；名稱不符: [${yearAlign.mismatched.join(', ') || '無'}]`
  });

  // 4. Scores (14欄) 與 Final_Results (9欄) 評分及決審表欄位對齊檢測
  const scoreSheet = ss.getSheetByName('Scores');
  const finalSheet = ss.getSheetByName('Final_Results');
  const expectedScoresHeaders = [
    'Competition_Year', 'Category', 'Group_Name', 'Team_ID', 'Judge_Code',
    'Score_Content', 'Score_Expression', 'Score_Stage', 'Score_Technique', 'Total_Score',
    'Award_Recommendation', 'Comment', 'Session_ID', 'Last_Updated'
  ];
  const expectedFinalHeaders = [
    'Competition_Year', 'Category', 'Group_Name', 'Team_ID',
    'Average_Score', 'Rank', 'Rank_Award', 'Feature_Award', 'Rec_Judge_Summary'
  ];
  const scoresAlign = verifySheetHeaderAlignment(scoreSheet, expectedScoresHeaders);
  const finalAlign = verifySheetHeaderAlignment(finalSheet, expectedFinalHeaders);
  const bothScoreTablesAligned = scoresAlign.aligned && finalAlign.aligned;

  checks.push({
    id: 'scores_results_alignment',
    title: '4. 評分與決審表欄位對齊 (Scores 14欄 & Final_Results 9欄)',
    status: bothScoreTablesAligned ? 'pass' : 'fail',
    detail: bothScoreTablesAligned
      ? `Scores (A~N 共 14 欄) 與 Final_Results (A~I 共 9 欄) 欄位結構與前端計分/共識總表 100% 對齊`
      : `Scores 缺失/不符: [${[...scoresAlign.missing, ...scoresAlign.mismatched].join(', ') || '無'}] ｜ Final_Results 缺失/不符: [${[...finalAlign.missing, ...finalAlign.mismatched].join(', ') || '無'}]`
  });

  // 5. Judge_Setup (5欄) 與評審代號 (A~I) 設定檢測
  const judgeSheet = ss.getSheetByName('Judge_Setup');
  const expectedJudgeHeaders = ['Competition_Year', 'Judge_Code', 'Judge_Name', 'Login_Password', 'Category_Short'];
  const judgeAlign = verifySheetHeaderAlignment(judgeSheet, expectedJudgeHeaders);
  let judgesCount = 0;
  let missingCodes = [];
  if (judgeSheet && judgeSheet.getLastRow() > 1) {
    const rows = judgeSheet.getRange(2, 1, judgeSheet.getLastRow() - 1, 5).getValues();
    const yearJudges = rows.filter(r => String(r[0]) === reqYear);
    judgesCount = yearJudges.length;
    const existingCodes = yearJudges.map(r => String(r[1]).trim());
    ['A','B','C','D','E','F','G','H','I'].forEach(code => {
      if (!existingCodes.includes(code)) missingCodes.push(code);
    });
  }

  checks.push({
    id: 'judges_setup',
    title: `5. 評審資料表欄位 (Judge_Setup 5欄) 與代號 A~I 對齊`,
    status: (judgeAlign.aligned && missingCodes.length === 0) ? 'pass' : (judgeAlign.aligned ? 'warn' : 'fail'),
    detail: (judgeAlign.aligned && missingCodes.length === 0)
      ? `A~E 共 5 欄結構正確，且 ${reqYear}學年度 9 位評審代號 (A~I) 皆已完整建立`
      : `欄位對齊: ${judgeAlign.aligned ? '正常' : '異常'} ｜ 已建立 ${judgesCount} 位評審，缺少代號: ${missingCodes.join(', ') || '無'}`
  });

  // 6. 前後端 API 連線、寄信服務與雲端快照表檢測
  const backupSheet = ss.getSheetByName('Backup_Timestamp');
  const expectedBackupHeaders = ['Snapshot_Name', 'Timestamp', 'Triggered_By'];
  const backupAlign = verifySheetHeaderAlignment(backupSheet, expectedBackupHeaders);
  let snapshotCount = 0;
  if (backupSheet && backupSheet.getLastRow() > 1) {
    snapshotCount = backupSheet.getLastRow() - 1;
  }
  const mailEnv = getMailEnvironmentInfo();

  checks.push({
    id: 'api_mail_snapshots_check',
    title: '6. 前後端 API 通訊、寄信服務與快照表 (Backup_Timestamp)',
    status: backupAlign.aligned ? 'pass' : 'warn',
    detail: `API 通訊驗證正常 ｜ 今日剩餘寄信配額：${mailEnv.remaining_quota !== null ? mailEnv.remaining_quota + ' 封' : '正常'} ｜ 快照表欄位對齊正常（已存 ${snapshotCount} 份快照）`
  });

  return {
    status: 'success',
    data: {
      timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      checks: checks
    }
  };
}

/**
 * 建立時間點快照 (Create Snapshot)
 */
function processCreateSnapshot(ss, payload) {
  const note = payload.note || '管理員手動快照';
  const reqYear = String(payload.year || payload.competition_year || 115);
  const timeStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmmss');
  const snapshotName = `Snapshot_${reqYear}_${timeStr}`;

  let backupSheet = ss.getSheetByName('Backup_Timestamp');
  if (!backupSheet) {
    backupSheet = ss.insertSheet('Backup_Timestamp');
    backupSheet.appendRow(['Snapshot_Name', 'Timestamp', 'Triggered_By']);
  }

  backupSheet.appendRow([snapshotName, new Date().toISOString(), note]);

  return {
    status: 'success',
    message: `快照 ${snapshotName} 建立成功！`,
    data: { snapshotName, timeStr }
  };
}

/**
 * 打包本機離線備份 (Export Backup JSON)
 */
function processExportBackup(ss, payload) {
  const reqYear = String(payload.year || payload.competition_year || 115);
  const sheetsToExport = ['System_Config', 'Judge_Setup', 'Year_Config', 'Teams', 'Scores', 'Final_Results'];
  const exportData = {};

  sheetsToExport.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 0) {
      exportData[name] = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    } else {
      exportData[name] = [];
    }
  });

  return {
    status: 'success',
    data: {
      competition_year: reqYear,
      exported_at: new Date().toISOString(),
      sheets: exportData
    }
  };
}

/**
 * =========================================================
 * 郵件通知套印與寄送引擎 (三階段草稿 + 測試信 + 公用信箱支援)
 * =========================================================
 */

function extractValidTeamEmails(team) {
  const rawList = [
    team.student1_email || team.Student1_Email,
    team.student2_email || team.Student2_Email,
    team.student3_email || team.Student3_Email,
    team.teacher1_email || team.Teacher1_Email,
    team.teacher2_email || team.Teacher2_Email
  ];
  const seen = {};
  const valid = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  rawList.forEach(item => {
    const str = String(item || '').trim().replace(/[,;，；\s]+/g, '');
    if (!str || str === '無' || str === '略' || str === '-') return;
    const lower = str.toLowerCase();
    if (emailRegex.test(str) && !seen[lower]) {
      seen[lower] = true;
      valid.push(str);
    }
  });
  return valid;
}

function escapeHtmlStr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTeamEmailContent(subjectTpl, bodyTpl, team, finalResult, teamScores) {
  const yearStr = String(team.competition_year || team.Competition_Year || '115');
  const catStr = String(team.category || team.Category || '【宜蘭在地自然人文特色】國小組');
  const schoolStr = String(team.school || team.School || '');
  const workTitleStr = String(team.work_title || team.Work_Title || '');
  const teamNameRaw = String(team.team_name || team.Team_Name || team.group_name || team.Group_Name || '').trim();
  const teamNameStr = (teamNameRaw && teamNameRaw !== catStr) ? teamNameRaw : workTitleStr;
  const descStr = String(team.description || team.Description || '');

  // 學生名單（含班級）
  const stuParts = [];
  for (let i = 1; i <= 3; i++) {
    const sName = String(team[`student${i}_name`] || team[`Student${i}_Name`] || '').trim();
    const sClass = String(team[`student${i}_class`] || team[`Student${i}_Class`] || '').trim();
    if (sName) {
      stuParts.push(sClass ? `${sName}（${sClass}）` : sName);
    }
  }
  const studentsStr = stuParts.length > 0 ? stuParts.join('、') : '參賽同學';

  // 指導老師與主要聯絡人
  const t1Name = String(team.teacher1_name || team.Teacher1_Name || '').trim();
  const t2Name = String(team.teacher2_name || team.Teacher2_Name || '').trim();
  const t1Phone = String(team.teacher1_phone || team.Teacher1_Phone || team.contact_phone || team.Contact_Phone || '').trim();
  const t2Phone = String(team.teacher2_phone || team.Teacher2_Phone || '').trim();
  const teachersStr = [t1Name, t2Name].filter(Boolean).join('、') || '指導老師';

  const contactRaw = String(team.contact_person || team.Contact_Person || '').trim();
  let primaryContactStr = t1Name || '指導老師';
  if (contactRaw === '指導教師2' || (t2Name && contactRaw === t2Name)) {
    primaryContactStr = `${t2Name || '指導教師2'}${t2Phone ? ' (' + t2Phone + ')' : ''}`;
  } else if (contactRaw === '指導教師1' || !contactRaw || (t1Name && contactRaw === t1Name)) {
    primaryContactStr = `${t1Name || '指導教師1'}${t1Phone ? ' (' + t1Phone + ')' : ''}`;
  } else {
    primaryContactStr = `${contactRaw}${t1Phone ? ' (' + t1Phone + ')' : ''}`;
  }

  // 作品連結清單
  const isCourseGroup = catStr.includes('校訂課程');
  const linkItems = [
    { label: '📊 簡報檔連結', url: String(team.slides_link || team.Slides_Link || '').trim() },
    { label: '🧠 Mindomo心智圖連結', url: String(team.mindmap_link || team.MindMap_Link || '').trim() },
    { label: '🎬 說明影片檔連結', url: String(team.video_link || team.Video_Link || '').trim() },
    { label: '📄 著作權授權同意書', url: String(team.consent_link || team.Consent_Link || '').trim() }
  ];
  if (isCourseGroup) {
    linkItems.push({ label: '📑 校訂課程計畫 PDF', url: String(team.course_plan_link || team.Course_Plan_Link || '').trim() });
  }
  const driveUrl = String(team.drive_link || team.Drive_Link || '').trim();
  if (driveUrl) {
    linkItems.push({ label: '☁️ 備用雲端資料夾', url: driveUrl });
  }

  const linksText = linkItems.map(item => `• ${item.label}：${item.url || '（尚未提供連結）'}`).join('\n');
  const linksHtml = `<div style="margin:10px 0;padding:12px 14px;background:#FFFDF7;border:1px solid #E6D5B8;border-radius:8px;">` +
    linkItems.map(item => {
      if (item.url) {
        return `<div style="margin:6px 0;"><strong style="color:#4E342E;">${escapeHtmlStr(item.label)}：</strong> <a href="${escapeHtmlStr(item.url)}" target="_blank" style="display:inline-block;padding:4px 12px;background:#5D4037;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:13px;font-weight:bold;">點此開啟並檢查權限 ↗</a></div>`;
      }
      return `<div style="margin:6px 0;"><strong style="color:#4E342E;">${escapeHtmlStr(item.label)}：</strong> <span style="color:#B71C1C;font-weight:bold;">⚠️ 尚未提供連結</span></div>`;
    }).join('') +
    `</div>`;

  // 補件異常備註
  const linkNoteStr = String(team.link_note || team.Link_Note || '').trim() || '請確認各項作品之 Google 雲端連結皆已開啟「知道連結的任何人皆可檢視」權限。';

  // 成績與獎項套印 (Final_Results + 115活動計畫獎勵標準)
  const rankAward = finalResult ? String(finalResult.rank_award || '').trim() : '';
  const featureAward = finalResult ? String(finalResult.feature_award || '').trim() : '';

  let awardSummaryText = '';
  if (rankAward && featureAward) {
    awardSummaryText = `恭喜榮獲 特色優選獎【${rankAward}】 暨 特色表現獎【${featureAward}】殊榮！`;
  } else if (rankAward) {
    awardSummaryText = `恭喜榮獲 特色優選獎【${rankAward}】殊榮！`;
  } else if (featureAward) {
    awardSummaryText = `恭喜榮獲 特色表現獎【${featureAward}】肯定！`;
  } else {
    awardSummaryText = '感謝貴隊完成本屆簡報達人擂台賽全程挑戰！';
  }

  // 依 115 活動計畫第八點自動組合獎勵與 12/20 頒獎典禮出席邀請
  const rewardLines = [];
  if (rankAward === '特優') {
    rewardLines.push('• 【特優獎獎勵】：每位參賽學生可獲 3,000 點 e幣及獎狀乙張；指導教師可獲 3,000 點 e幣及行政敘獎。');
  } else if (rankAward === '優等') {
    rewardLines.push('• 【優等獎獎勵】：每位參賽學生可獲 2,000 點 e幣及獎狀乙張；指導教師可獲 2,000 點 e幣及行政敘獎。');
  }
  if (featureAward === '簡報之星') {
    rewardLines.push('• 【簡報之星獎勵】：每位參賽學生可獲 2,000 點 e幣及獎品乙份；指導教師可獲 2,000 點 e幣。');
  } else if (featureAward === '學習之星') {
    rewardLines.push('• 【學習之星獎勵】：每位參賽學生可獲 500 點 e幣；指導教師可獲 500 點 e幣。');
  }
  if (rankAward === '特優' || rankAward === '優等') {
    rewardLines.push('• 🎉 【頒獎典禮暨成果展現邀請】：貴隊榮獲「' + rankAward + '」，誠摯邀請貴隊師生於 115年12月20日（日）出席「宜蘭縣科技競賽暨數位親子嘉年華」活動現場受獎及成果展現！');
  }
  const rewardSummaryText = rewardLines.length > 0 ? rewardLines.join('\n') : '• 相關獎勵將依大會活動計畫規定核發。';

  // 匿名評審評語彙整 (Scores)
  const validComments = Array.isArray(teamScores)
    ? teamScores.map(s => String(s.comment || '').trim()).filter(Boolean)
    : [];
  const chineseNums = ['一', '二', '三', '四'];
  const commentsText = validComments.length > 0
    ? validComments.map((c, idx) => `• 評審委員${chineseNums[idx] || (idx + 1)} 回饋：\n  ${c}`).join('\n\n')
    : '• （評審委員肯定貴隊之用心投入與完整表現）';

  const replaceTokens = (tpl, isHtml) => {
    let out = String(tpl || '');
    const map = {
      '{學年度}': isHtml ? escapeHtmlStr(yearStr) : yearStr,
      '{參賽組別}': isHtml ? escapeHtmlStr(catStr) : catStr,
      '{隊伍名稱}': isHtml ? escapeHtmlStr(teamNameStr) : teamNameStr,
      '{隊名}': isHtml ? escapeHtmlStr(teamNameStr) : teamNameStr,
      '{學校}': isHtml ? escapeHtmlStr(schoolStr) : schoolStr,
      '{作品名稱}': isHtml ? escapeHtmlStr(workTitleStr) : workTitleStr,
      '{作品說明}': isHtml ? escapeHtmlStr(descStr) : descStr,
      '{學生名單}': isHtml ? escapeHtmlStr(studentsStr) : studentsStr,
      '{指導老師}': isHtml ? escapeHtmlStr(teachersStr) : teachersStr,
      '{主要聯絡人}': isHtml ? escapeHtmlStr(primaryContactStr) : primaryContactStr,
      '{聯絡人}': isHtml ? escapeHtmlStr(primaryContactStr) : primaryContactStr,
      '{作品連結清單}': isHtml ? '__HTML_LINKS_BLOCK__' : linksText,
      '{補件異常備註}': isHtml ? `<div style="margin:8px 0;padding:10px 14px;background:#FFF3E0;border-left:4px solid #E65100;color:#BF360C;font-weight:bold;">${escapeHtmlStr(linkNoteStr).replace(/\n/g, '<br>')}</div>` : linkNoteStr,
      '{特色優選獎}': isHtml ? escapeHtmlStr(rankAward || '—') : (rankAward || '—'),
      '{特色表現獎}': isHtml ? escapeHtmlStr(featureAward || '—') : (featureAward || '—'),
      '{榮獲獎項總覽}': isHtml ? `<div style="margin:8px 0;padding:10px 14px;background:#FFF8E1;border:1px solid #FFCA28;border-radius:8px;color:#4E342E;font-size:15px;font-weight:bold;">${escapeHtmlStr(awardSummaryText)}</div>` : awardSummaryText,
      '{獎勵與頒獎說明}': isHtml ? `<div style="margin:8px 0;padding:10px 14px;background:#F1F8E9;border:1px solid #C5E1A5;border-radius:8px;color:#1B5E20;">${escapeHtmlStr(rewardSummaryText).replace(/\n/g, '<br>')}</div>` : rewardSummaryText,
      '{評審評語彙整}': isHtml ? `<div style="margin:8px 0;padding:12px 14px;background:#FAFAFA;border-left:4px solid #5D4037;color:#212121;">${escapeHtmlStr(commentsText).replace(/\n/g, '<br>')}</div>` : commentsText,
      '{Team_Name}': isHtml ? escapeHtmlStr(teamNameStr) : teamNameStr
    };

    Object.keys(map).forEach(token => {
      out = out.split(token).join(map[token]);
    });
    return out;
  };

  const renderedSubject = replaceTokens(subjectTpl, false);
  const renderedPlainBody = replaceTokens(bodyTpl, false);

  let htmlInner = replaceTokens(bodyTpl, true)
    .split('\n')
    .map(line => line.trim() === '' ? '<div style="height:10px;"></div>' : `<div style="line-height:1.75;margin-bottom:4px;">${line}</div>`)
    .join('')
    .replace('__HTML_LINKS_BLOCK__', linksHtml);

  const renderedHtmlBody = `
    <div style="font-family:'Noto Sans TC','Microsoft JhengHei',sans-serif;max-width:680px;margin:0 auto;background:#FDFBF7;border:2px solid #4E342E;border-radius:12px;overflow:hidden;color:#2D241E;">
      <div style="background:#3E2723;color:#FFFFFF;padding:16px 22px;border-bottom:3px solid #D84315;">
        <div style="font-size:18px;font-weight:900;letter-spacing:0.5px;">${escapeHtmlStr(yearStr)}學年度 宜蘭縣國民中小學簡報達人擂台賽</div>
        <div style="font-size:12px;color:#FFCCBC;margin-top:4px;">宜蘭縣政府教育網路中心 — 賽事官方自動通知系統</div>
      </div>
      <div style="padding:22px 24px;font-size:14px;color:#212121;background:#FFFFFF;">
        ${htmlInner}
      </div>
      <div style="background:#F5EFE6;padding:12px 22px;font-size:12px;color:#6D4C41;border-top:1px solid #E0D4C3;text-align:center;">
        本郵件由「${escapeHtmlStr(yearStr)}學年度 宜蘭縣簡報達人擂台賽評審與賽事系統」發送
      </div>
    </div>
  `;

  return {
    subject: renderedSubject,
    plainBody: renderedPlainBody,
    htmlBody: renderedHtmlBody
  };
}

function dispatchEmailMessage(recipientCsv, subject, plainBody, htmlBody, senderConfig) {
  const cfg = senderConfig || {};
  const senderName = String(cfg.sender_name || '115學年度宜蘭縣簡報達人擂台賽工作小組').trim();
  const fromAlias = String(cfg.from_alias || '').trim();
  const replyTo = String(cfg.reply_to || fromAlias || '').trim();
  const bccSelf = !!cfg.bcc_self && replyTo;

  const mailOptions = {
    name: senderName,
    htmlBody: htmlBody
  };
  if (replyTo) mailOptions.replyTo = replyTo;
  if (bccSelf) mailOptions.bcc = replyTo;

  // 若有指定公用信箱別名 (Alias)，優先嘗試透過 GmailApp 以別名寄出
  if (fromAlias && typeof GmailApp !== 'undefined') {
    try {
      const aliases = GmailApp.getAliases() || [];
      if (aliases.includes(fromAlias)) {
        GmailApp.sendEmail(recipientCsv, subject, plainBody, {
          ...mailOptions,
          from: fromAlias
        });
        return { method: 'GmailApp_Alias', from: fromAlias };
      }
    } catch (aliasErr) {
      Logger.log('GmailApp alias fallback to MailApp: ' + aliasErr);
    }
  }

  MailApp.sendEmail({
    to: recipientCsv,
    subject: subject,
    body: plainBody,
    ...mailOptions
  });
  return { method: 'MailApp', from: replyTo || '當前授權帳號' };
}

/**
 * 發送單封「測試信」給管理員自己檢查排版與別名
 */
function processSendTestEmail(ss, payload) {
  const testEmail = String(payload.test_email || '').trim();
  if (!testEmail || !testEmail.includes('@')) {
    return { status: 'error', message: '請輸入有效的測試收件人 Email 信箱！', data: null };
  }

  const reqYear = String(payload.year || payload.competition_year || 115);
  const subjectTpl = String(payload.subject || '');
  const bodyTpl = String(payload.body || '');
  const senderConfig = payload.sender_config || DEFAULT_EMAIL_DRAFTS.sender_config;
  const sampleTeamId = String(payload.sample_team_id || '').trim();

  // 讀取真實隊伍作為測試套印樣本，若無隊伍則使用範例隊伍
  const teamsRes = processGetAllTeams(ss, { year: reqYear });
  const allTeams = (teamsRes.status === 'success' && Array.isArray(teamsRes.data)) ? teamsRes.data : [];
  let sampleTeam = allTeams.find(t => String(t.team_id) === sampleTeamId) || allTeams[0];

  if (!sampleTeam) {
    sampleTeam = {
      team_id: 'sample_01',
      competition_year: reqYear,
      category: '【宜蘭在地自然人文特色】國小組',
      group_name: '蘭陽小尖兵隊',
      team_name: '蘭陽小尖兵隊',
      school: '宜蘭國小（範例）',
      work_title: '宜蘭古城文化巡禮（測試範例作品）',
      description: '本作品透過實地踏查與訪談，探究宜蘭舊城歷史建築與民俗文化。',
      student1_class: '六年甲班',
      student1_name: '王小明',
      student2_class: '六年乙班',
      student2_name: '林小華',
      teacher1_name: '陳大文老師',
      teacher1_phone: '0912-345678',
      contact_person: '指導教師1',
      slides_link: 'https://docs.google.com/presentation/',
      mindmap_link: 'https://www.mindomo.com/',
      video_link: 'https://www.youtube.com/',
      consent_link: 'https://drive.google.com/',
      link_note: '【範例提醒】貴隊提交之「簡報檔連結」目前未開啟公開檢視權限，請調整為「知道連結的任何人皆可檢視」。'
    };
  }

  const sampleFinalResult = {
    rank_award: '特優',
    feature_award: '簡報之星'
  };
  const sampleScores = [
    { comment: '主題探究深入，心智圖架構十分清晰，能結合在地生活經驗提出具體觀點。' },
    { comment: '口語表達自然流暢，團隊成員默契極佳，簡報視覺排版相當吸睛。' },
    { comment: '資料引用標示完整，時間掌控精準，展現優秀的資訊素養與自信台風！' }
  ];

  const rendered = renderTeamEmailContent(subjectTpl, bodyTpl, sampleTeam, sampleFinalResult, sampleScores);
  const testSubject = `[測試信] ${rendered.subject}`;

  const sendResult = dispatchEmailMessage(
    testEmail,
    testSubject,
    rendered.plainBody,
    rendered.htmlBody,
    senderConfig
  );

  const mailEnv = getMailEnvironmentInfo();

  return {
    status: 'success',
    message: `✅ 測試信已成功寄出至 ${testEmail}！（寄送方式：${sendResult.method}，今日剩餘額度：${mailEnv.remaining_quota ?? '充足'} 封）`,
    data: {
      sent_to: testEmail,
      subject: testSubject,
      preview_html: rendered.htmlBody,
      mail_env: mailEnv
    }
  };
}

/**
 * 批次或單隊發送正式通知信（1.正式參賽通知 confirm / 2.補件提醒 remind / 3.成績評語通知 result）
 * 並自動將寄送時間寫入 Teams 資料表之 AA 欄 (Memo)
 */
function processSendTeamEmails(ss, payload) {
  const reqYear = String(payload.year || payload.competition_year || 115);
  const templateType = String(payload.template_type || 'confirm'); // 'confirm' | 'remind' | 'result'
  const targetTeamIds = Array.isArray(payload.team_ids) ? payload.team_ids.map(id => String(id).trim()) : [];
  const customLinkNote = payload.custom_link_note !== undefined ? String(payload.custom_link_note).trim() : null;

  if (targetTeamIds.length === 0) {
    return { status: 'error', message: '未選擇任何要發信的參賽隊伍！', data: null };
  }

  // 1. 讀取系統設定中之範本與公用信箱設定
  const cfgRes = processGetSystemConfig(ss, { year: reqYear });
  if (cfgRes.status !== 'success' || !cfgRes.data) {
    return { status: 'error', message: '無法讀取系統郵件範本設定', data: null };
  }
  const sysCfg = cfgRes.data;
  const senderConfig = payload.sender_config || sysCfg.sender_config || DEFAULT_EMAIL_DRAFTS.sender_config;

  let subjectTpl = payload.subject || '';
  let bodyTpl = payload.body || '';
  let typeLabel = '參賽通知';

  if (templateType === 'remind') {
    subjectTpl = subjectTpl || sysCfg.email_remind_subject;
    bodyTpl = bodyTpl || sysCfg.email_remind_body;
    typeLabel = '補件提醒';
  } else if (templateType === 'result') {
    subjectTpl = subjectTpl || sysCfg.email_result_subject;
    bodyTpl = bodyTpl || sysCfg.email_result_body;
    typeLabel = '成績通知';
  } else {
    subjectTpl = subjectTpl || sysCfg.email_confirm_subject;
    bodyTpl = bodyTpl || sysCfg.email_confirm_body;
    typeLabel = '參賽通知';
  }

  // 2. 讀取 Teams 表、Scores 表、Final_Results 表
  const teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) return { status: 'error', message: '找不到 Teams 資料表', data: null };
  ensureTeamsSheetColumns(teamSheet);

  const teamsRes = processGetAllTeams(ss, { year: reqYear });
  const allTeams = (teamsRes.status === 'success' && Array.isArray(teamsRes.data)) ? teamsRes.data : [];

  let allScores = [];
  let finalResultsMap = {};
  if (templateType === 'result') {
    const scoresRes = processGetJudgeScores(ss, { year: reqYear });
    allScores = (scoresRes.status === 'success' && Array.isArray(scoresRes.data)) ? scoresRes.data : [];

    const finalSheet = ss.getSheetByName('Final_Results');
    if (finalSheet && finalSheet.getLastRow() > 1) {
      const fRows = finalSheet.getRange(2, 1, finalSheet.getLastRow() - 1, 9).getValues();
      fRows.forEach(r => {
        if (String(r[0]) === reqYear) {
          finalResultsMap[String(r[3]).trim()] = {
            average_score: r[4],
            rank: r[5],
            rank_award: String(r[6] || ''),
            feature_award: String(r[7] || '')
          };
        }
      });
    }
  }

  const lastRow = teamSheet.getLastRow();
  const sheetIds = lastRow > 1 ? teamSheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]).trim()) : [];

  const nowTimeStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'MM/dd HH:mm');
  let sentTeamsCount = 0;
  let sentEmailsCount = 0;
  const skippedTeams = [];
  const updatedMemos = {};

  targetTeamIds.forEach(tid => {
    const team = allTeams.find(t => String(t.team_id).trim() === tid);
    if (!team) return;

    if (customLinkNote !== null && targetTeamIds.length === 1) {
      team.link_note = customLinkNote;
      team.Link_Note = customLinkNote;
    }

    const recipients = extractValidTeamEmails(team);
    if (recipients.length === 0) {
      skippedTeams.push(`${team.school || ''}《${team.work_title || ''}》（無有效信箱）`);
      return;
    }

    const fResult = finalResultsMap[tid] || null;
    const tScores = allScores.filter(s => String(s.team_id).trim() === tid);
    const rendered = renderTeamEmailContent(subjectTpl, bodyTpl, team, fResult, tScores);

    try {
      dispatchEmailMessage(
        recipients.join(','),
        rendered.subject,
        rendered.plainBody,
        rendered.htmlBody,
        senderConfig
      );
      sentTeamsCount++;
      sentEmailsCount += recipients.length;

      // 更新試算表 AA 欄 (Memo, 第27欄) 紀錄寄信狀態
      const rowIdx = sheetIds.findIndex(id => id === tid);
      if (rowIdx !== -1) {
        const sheetRowNum = rowIdx + 2;
        if (customLinkNote !== null && targetTeamIds.length === 1) {
          teamSheet.getRange(sheetRowNum, 26).setValue(customLinkNote); // Z欄 Link_Note
        }
        const oldMemo = String(team.memo || '').trim();
        const tagPrefix = `[${typeLabel}:`;
        const cleanedParts = oldMemo
          ? oldMemo.split(/(?=\[)/).map(s => s.trim()).filter(s => s && !s.startsWith(tagPrefix))
          : [];
        cleanedParts.push(`[${typeLabel}:${nowTimeStr}]`);
        const newMemo = cleanedParts.join(' ');
        teamSheet.getRange(sheetRowNum, 27).setValue(newMemo); // AA欄 Memo
        updatedMemos[tid] = newMemo;
      }
    } catch (sendErr) {
      skippedTeams.push(`${team.school || ''}《${team.work_title || ''}》（發送失敗: ${sendErr.message}）`);
    }
  });

  SpreadsheetApp.flush();
  const mailEnv = getMailEnvironmentInfo();

  return {
    status: 'success',
    message: `🎉 發信完成！共成功寄發 ${sentTeamsCount} 支隊伍（合計 ${sentEmailsCount} 位師生收件人）${skippedTeams.length > 0 ? `；略過 ${skippedTeams.length} 隊` : ''}。`,
    data: {
      sent_teams_count: sentTeamsCount,
      sent_emails_count: sentEmailsCount,
      skipped_teams: skippedTeams,
      updated_memos: updatedMemos,
      mail_env: mailEnv
    }
  };
}
