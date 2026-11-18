/**
 * 簡報達人評分系統 v77.6 - GAS Team Service (Service_Teams.js)
 * 職責：隊伍資料 CRUD、單筆與批次 SheetJS 格式匯入
 * 架構：全面升級「表頭標題名稱動態對應 (Dynamic Header Mapping)」，完全不拘直欄順序！
 */

const TEAMS_HEADERS_V77 = [
  'Team_ID', 'Competition_Year', 'Category', 'Group_Name', 'School', 'Work_Title', 'Description',
  'Student1_Name', 'Student1_Email', 'Student2_Name', 'Student2_Email', 'Student3_Name', 'Student3_Email',
  'Teacher1_Name', 'Teacher1_Email', 'Teacher2_Name', 'Teacher2_Email',
  'Contact_Person', 'Contact_Phone',
  'MindMap_Link', 'Slides_Link', 'Video_Link', 'Consent_Link', 'Course_Plan_Link', 'Drive_Link',
  'Link_Note', 'Memo',
  'Student1_Class', 'Student2_Class', 'Student3_Class', 'Teacher2_Phone'
];

/**
 * 取得試算表表頭的「名稱 -> 索引」對照地圖
 */
function getSheetHeaderMap(sheet) {
  if (!sheet || sheet.getLastColumn() < 1) return {};
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, idx) => {
    const key = String(h || '').trim();
    if (key) map[key] = idx;
  });
  return map;
}

/**
 * 確保 Teams 工作表具備所有必要欄位標題；若有缺失欄位，一律安全追加在最末尾，絕不更動既有欄位位置！
 */
function ensureTeamsSheetColumns(teamSheet) {
  if (!teamSheet) return;
  const lastCol = teamSheet.getLastColumn();
  const currentHeaders = lastCol > 0
    ? teamSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim())
    : [];

  TEAMS_HEADERS_V77.forEach(expectedHeader => {
    if (!currentHeaders.includes(expectedHeader)) {
      const nextCol = teamSheet.getLastColumn() + 1;
      teamSheet.getRange(1, nextCol).setValue(expectedHeader).setFontWeight('bold');
      currentHeaders.push(expectedHeader);
    }
  });
}

function processGetAllTeams(ss, payload) {
  const targetYear = payload.year || payload.competition_year;
  const teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) return { status: 'error', message: 'Teams sheet not found', data: [] };

  ensureTeamsSheetColumns(teamSheet);

  const lastRow = teamSheet.getLastRow();
  if (lastRow < 2) return { status: 'success', data: [] };

  const lastCol = teamSheet.getLastColumn();
  const values = teamSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const headerMap = getSheetHeaderMap(teamSheet);

  const getCol = (row, name, fallbackIdx) => {
    if (headerMap[name] !== undefined && headerMap[name] < row.length) {
      return row[headerMap[name]];
    }
    if (fallbackIdx !== undefined && fallbackIdx < row.length) {
      return row[fallbackIdx];
    }
    return '';
  };

  let teams = values.map(row => {
    const catStr = String(getCol(row, 'Category', 2) || '').trim();
    const grpStr = String(getCol(row, 'Group_Name', 3) || '').trim();
    // D欄 (Group_Name) 存放隊伍名稱；若舊測試資料與 C欄相同則不重複顯示為隊名
    const resolvedTeamName = (grpStr && grpStr !== catStr) ? grpStr : '';
    const resolvedCategory = catStr || grpStr;
    const t1Phone = String(getCol(row, 'Contact_Phone', 18) || '').trim();
    const t2Phone = String(getCol(row, 'Teacher2_Phone', 30) || '').trim();

    return {
      team_id: String(getCol(row, 'Team_ID', 0) || ''),
      Team_ID: String(getCol(row, 'Team_ID', 0) || ''),
      competition_year: getCol(row, 'Competition_Year', 1),
      Competition_Year: getCol(row, 'Competition_Year', 1),
      Category: resolvedCategory,
      category: resolvedCategory,
      Group_Name: grpStr,
      group_name: grpStr,
      Team_Name: resolvedTeamName,
      team_name: resolvedTeamName,
      School: String(getCol(row, 'School', 4) || ''),
      school: String(getCol(row, 'School', 4) || ''),
      Work_Title: String(getCol(row, 'Work_Title', 5) || ''),
      work_title: String(getCol(row, 'Work_Title', 5) || ''),
      Description: String(getCol(row, 'Description', 6) || ''),
      description: String(getCol(row, 'Description', 6) || ''),
      // 學生 1~3 (姓名、信箱、班級)
      Student1_Name: String(getCol(row, 'Student1_Name', 7) || ''),
      student1_name: String(getCol(row, 'Student1_Name', 7) || ''),
      Student1_Email: String(getCol(row, 'Student1_Email', 8) || ''),
      student1_email: String(getCol(row, 'Student1_Email', 8) || ''),
      Student1_Class: String(getCol(row, 'Student1_Class', 27) || ''),
      student1_class: String(getCol(row, 'Student1_Class', 27) || ''),
      Student2_Name: String(getCol(row, 'Student2_Name', 9) || ''),
      student2_name: String(getCol(row, 'Student2_Name', 9) || ''),
      Student2_Email: String(getCol(row, 'Student2_Email', 10) || ''),
      student2_email: String(getCol(row, 'Student2_Email', 10) || ''),
      Student2_Class: String(getCol(row, 'Student2_Class', 28) || ''),
      student2_class: String(getCol(row, 'Student2_Class', 28) || ''),
      Student3_Name: String(getCol(row, 'Student3_Name', 11) || ''),
      student3_name: String(getCol(row, 'Student3_Name', 11) || ''),
      Student3_Email: String(getCol(row, 'Student3_Email', 12) || ''),
      student3_email: String(getCol(row, 'Student3_Email', 12) || ''),
      Student3_Class: String(getCol(row, 'Student3_Class', 29) || ''),
      student3_class: String(getCol(row, 'Student3_Class', 29) || ''),
      // 指導教師 1~2 與主要聯絡人
      Teacher1_Name: String(getCol(row, 'Teacher1_Name', 13) || ''),
      teacher1_name: String(getCol(row, 'Teacher1_Name', 13) || ''),
      Teacher1_Email: String(getCol(row, 'Teacher1_Email', 14) || ''),
      teacher1_email: String(getCol(row, 'Teacher1_Email', 14) || ''),
      Teacher1_Phone: t1Phone,
      teacher1_phone: t1Phone,
      Teacher2_Name: String(getCol(row, 'Teacher2_Name', 15) || ''),
      teacher2_name: String(getCol(row, 'Teacher2_Name', 15) || ''),
      Teacher2_Email: String(getCol(row, 'Teacher2_Email', 16) || ''),
      teacher2_email: String(getCol(row, 'Teacher2_Email', 16) || ''),
      Teacher2_Phone: t2Phone,
      teacher2_phone: t2Phone,
      Contact_Person: String(getCol(row, 'Contact_Person', 17) || ''),
      contact_person: String(getCol(row, 'Contact_Person', 17) || ''),
      Contact_Phone: t1Phone,
      contact_phone: t1Phone,
      // 作品連結與審核/寄信紀錄
      MindMap_Link: String(getCol(row, 'MindMap_Link', 19) || ''),
      mindmap_link: String(getCol(row, 'MindMap_Link', 19) || ''),
      Slides_Link: String(getCol(row, 'Slides_Link', 20) || ''),
      slides_link: String(getCol(row, 'Slides_Link', 20) || ''),
      Video_Link: String(getCol(row, 'Video_Link', 21) || ''),
      video_link: String(getCol(row, 'Video_Link', 21) || ''),
      Consent_Link: String(getCol(row, 'Consent_Link', 22) || ''),
      consent_link: String(getCol(row, 'Consent_Link', 22) || ''),
      Course_Plan_Link: String(getCol(row, 'Course_Plan_Link', 23) || ''),
      course_plan_link: String(getCol(row, 'Course_Plan_Link', 23) || ''),
      Drive_Link: String(getCol(row, 'Drive_Link', 24) || ''),
      drive_link: String(getCol(row, 'Drive_Link', 24) || ''),
      Link_Note: String(getCol(row, 'Link_Note', 25) || ''),
      link_note: String(getCol(row, 'Link_Note', 25) || ''),
      Memo: String(getCol(row, 'Memo', 26) || ''),
      memo: String(getCol(row, 'Memo', 26) || '')
    };
  });

  if (targetYear) {
    teams = teams.filter(t => String(t.competition_year) === String(targetYear));
  }

  return { status: 'success', data: teams };
}

/**
 * 依試算表實際存在的表頭順序動態組裝隊伍列，絕不放錯欄位！
 */
function buildTeamRowData(team, teamId, existingRow, sheetHeaders) {
  const headers = Array.isArray(sheetHeaders) && sheetHeaders.length > 0 ? sheetHeaders : TEAMS_HEADERS_V77;

  const t1Phone = team.teacher1_phone !== undefined ? team.teacher1_phone : (team.Teacher1_Phone !== undefined ? team.Teacher1_Phone : (team.contact_phone !== undefined ? team.contact_phone : team.Contact_Phone));
  const t2Phone = team.teacher2_phone !== undefined ? team.teacher2_phone : team.Teacher2_Phone;
  const grpName = team.team_name !== undefined && team.team_name !== '' ? team.team_name : (team.group_name !== undefined ? team.group_name : team.Group_Name);

  const valueMap = {
    'Team_ID': teamId,
    'Competition_Year': team.competition_year ?? team.Competition_Year ?? 115,
    'Category': team.category ?? team.Category ?? '',
    'Group_Name': grpName ?? '',
    'School': team.school ?? team.School ?? '',
    'Work_Title': team.work_title ?? team.Work_Title ?? '',
    'Description': team.description ?? team.Description ?? '',
    'Student1_Name': team.student1_name ?? team.Student1_Name ?? '',
    'Student1_Email': team.student1_email ?? team.Student1_Email ?? '',
    'Student1_Class': team.student1_class ?? team.Student1_Class ?? '',
    'Student2_Name': team.student2_name ?? team.Student2_Name ?? '',
    'Student2_Email': team.student2_email ?? team.Student2_Email ?? '',
    'Student2_Class': team.student2_class ?? team.Student2_Class ?? '',
    'Student3_Name': team.student3_name ?? team.Student3_Name ?? '',
    'Student3_Email': team.student3_email ?? team.Student3_Email ?? '',
    'Student3_Class': team.student3_class ?? team.Student3_Class ?? '',
    'Teacher1_Name': team.teacher1_name ?? team.Teacher1_Name ?? '',
    'Teacher1_Email': team.teacher1_email ?? team.Teacher1_Email ?? '',
    'Teacher1_Phone': t1Phone ?? '',
    'Teacher2_Name': team.teacher2_name ?? team.Teacher2_Name ?? '',
    'Teacher2_Email': team.teacher2_email ?? team.Teacher2_Email ?? '',
    'Teacher2_Phone': t2Phone ?? '',
    'Contact_Person': team.contact_person ?? team.Contact_Person ?? '',
    'Contact_Phone': t1Phone ?? '',
    'MindMap_Link': team.mindmap_link ?? team.MindMap_Link ?? '',
    'Slides_Link': team.slides_link ?? team.Slides_Link ?? '',
    'Video_Link': team.video_link ?? team.Video_Link ?? '',
    'Consent_Link': team.consent_link ?? team.Consent_Link ?? '',
    'Course_Plan_Link': team.course_plan_link ?? team.Course_Plan_Link ?? '',
    'Drive_Link': team.drive_link ?? team.Drive_Link ?? '',
    'Link_Note': team.link_note ?? team.Link_Note ?? '',
    'Memo': team.memo ?? team.Memo ?? ''
  };

  return headers.map((headerName, idx) => {
    const cleanHeader = String(headerName || '').trim();
    if (valueMap[cleanHeader] !== undefined && valueMap[cleanHeader] !== '') {
      return valueMap[cleanHeader];
    }
    if (existingRow && existingRow[idx] !== undefined) {
      return existingRow[idx];
    }
    return valueMap[cleanHeader] || '';
  });
}

function processSaveTeam(ss, payload) {
  const team = payload.team;
  if (!team) return { status: 'error', message: 'Missing team data', data: null };

  const teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) return { status: 'error', message: 'Teams sheet not found', data: null };
  ensureTeamsSheetColumns(teamSheet);

  const lastRow = teamSheet.getLastRow();
  const lastCol = teamSheet.getLastColumn();
  const teamId = String(team.team_id || team.Team_ID || Utilities.getUuid()).trim();
  const sheetHeaders = lastCol > 0 ? teamSheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const headerMap = getSheetHeaderMap(teamSheet);
  const idColIdx = headerMap['Team_ID'] !== undefined ? headerMap['Team_ID'] : 0;

  let rowIndex = -1;
  let existingRow = null;
  if (lastRow > 1) {
    const allRows = teamSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    const foundIdx = allRows.findIndex(r => String(r[idColIdx] || '').trim() === teamId);
    if (foundIdx !== -1) {
      rowIndex = foundIdx + 2;
      existingRow = allRows[foundIdx];
    }
  }

  const rowData = buildTeamRowData(team, teamId, existingRow, sheetHeaders);

  if (rowIndex !== -1) {
    teamSheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    teamSheet.appendRow(rowData);
  }

  SpreadsheetApp.flush();
  return { status: 'success', message: '隊伍資料已成功儲存至試算表！', data: { team_id: teamId } };
}

function processImportTeams(ss, payload) {
  const teams = payload.teams;
  if (!Array.isArray(teams) || teams.length === 0) {
    return { status: 'error', message: 'No teams array provided for import', data: null };
  }

  const teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) return { status: 'error', message: 'Teams sheet not found', data: null };
  ensureTeamsSheetColumns(teamSheet);

  const lastRow = teamSheet.getLastRow();
  const lastCol = teamSheet.getLastColumn();
  const sheetHeaders = lastCol > 0 ? teamSheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const headerMap = getSheetHeaderMap(teamSheet);
  const idColIdx = headerMap['Team_ID'] !== undefined ? headerMap['Team_ID'] : 0;
  const schoolColIdx = headerMap['School'] !== undefined ? headerMap['School'] : 4;
  const titleColIdx = headerMap['Work_Title'] !== undefined ? headerMap['Work_Title'] : 5;
  const grpColIdx = headerMap['Group_Name'] !== undefined ? headerMap['Group_Name'] : 3;

  let existingRows = [];
  if (lastRow > 1) {
    existingRows = teamSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  }

  let addedCount = 0;
  let updatedCount = 0;

  teams.forEach(team => {
    const reqYear = String(team.competition_year || 115);
    const reqId = String(team.team_id || '').trim();
    const reqSchool = String(team.school || '').trim();
    const reqTitle = String(team.work_title || '').trim();
    const reqGroup = String(team.group_name || team.team_name || '').trim();

    let foundIdx = -1;
    if (reqId && !reqId.startsWith('team_')) {
      foundIdx = existingRows.findIndex(r => String(r[idColIdx] || '').trim() === reqId);
    }
    if (foundIdx === -1 && reqSchool && (reqTitle || reqGroup)) {
      foundIdx = existingRows.findIndex(r =>
        String(r[1]) === reqYear &&
        String(r[schoolColIdx] || '').trim() === reqSchool &&
        ((reqTitle && String(r[titleColIdx] || '').trim() === reqTitle) || (reqGroup && String(r[grpColIdx] || '').trim() === reqGroup))
      );
    }

    if (foundIdx !== -1) {
      const existingRow = existingRows[foundIdx];
      const finalId = String(existingRow[idColIdx] || reqId);
      // 合併更新：若匯入列中某欄位為空字串，保留既有試算表內的資料（如兩階段報名與繳件合併）
      const mergedTeam = {};
      Object.keys(team).forEach(k => {
        if (team[k] !== '' && team[k] !== null && team[k] !== undefined) {
          mergedTeam[k] = team[k];
        }
      });
      const rowData = buildTeamRowData(mergedTeam, finalId, existingRow, sheetHeaders);
      teamSheet.getRange(foundIdx + 2, 1, 1, rowData.length).setValues([rowData]);
      existingRows[foundIdx] = rowData;
      updatedCount++;
    } else {
      const newId = reqId || Utilities.getUuid();
      const rowData = buildTeamRowData(team, newId, null, sheetHeaders);
      teamSheet.appendRow(rowData);
      existingRows.push(rowData);
      addedCount++;
    }
  });

  SpreadsheetApp.flush();
  return {
    status: 'success',
    message: `匯入完成：新增 ${addedCount} 隊、合併更新 ${updatedCount} 隊！`,
    data: { added: addedCount, updated: updatedCount }
  };
}
