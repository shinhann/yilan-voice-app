/**
 * 簡報達人評分系統 v77.4 - GAS Team Service (Service_Teams.js)
 * 職責：處理隊伍名單 CRUD、單隊線上編輯與 SheetJS 批次匯入
 * 採用【做法 A】：保留 A~AA 欄（1~27欄）完全不動，於最右側擴充 AB~AE 欄（學生1~3班級、指導教師2電話）
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

function ensureTeamsSheetColumns(teamSheet) {
  if (!teamSheet) return;
  const lastCol = teamSheet.getLastColumn();
  if (lastCol < TEAMS_HEADERS_V77.length) {
    const currentHeaders = lastCol > 0 ? teamSheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    for (let i = 0; i < TEAMS_HEADERS_V77.length; i++) {
      if (!currentHeaders[i] || String(currentHeaders[i]).trim() === '') {
        teamSheet.getRange(1, i + 1).setValue(TEAMS_HEADERS_V77[i]).setFontWeight('bold');
      }
    }
  }
}

function processGetAllTeams(ss, payload) {
  const targetYear = payload.year || payload.competition_year;
  const teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) return { status: 'error', message: 'Teams sheet not found', data: [] };

  ensureTeamsSheetColumns(teamSheet);

  const lastRow = teamSheet.getLastRow();
  if (lastRow < 2) return { status: 'success', data: [] };

  const colCount = Math.max(teamSheet.getLastColumn(), TEAMS_HEADERS_V77.length);
  const values = teamSheet.getRange(2, 1, lastRow - 1, colCount).getValues();

  let teams = values.map(row => {
    const catStr = String(row[2] || '').trim();
    const grpStr = String(row[3] || '').trim();
    // D欄 (Group_Name) 存放隊伍名稱；若舊測試資料與 C欄相同則不重複顯示為隊名
    const resolvedTeamName = (grpStr && grpStr !== catStr) ? grpStr : '';
    const resolvedCategory = catStr || grpStr;
    const t1Phone = String(row[18] || '').trim();
    const t2Phone = String(row[30] || '').trim();

    return {
      team_id: String(row[0] || ''),
      Team_ID: String(row[0] || ''),
      competition_year: row[1],
      Competition_Year: row[1],
      Category: resolvedCategory,
      category: resolvedCategory,
      Group_Name: grpStr,
      group_name: grpStr,
      Team_Name: resolvedTeamName,
      team_name: resolvedTeamName,
      School: String(row[4] || ''),
      school: String(row[4] || ''),
      Work_Title: String(row[5] || ''),
      work_title: String(row[5] || ''),
      Description: String(row[6] || ''),
      description: String(row[6] || ''),
      // 學生 1~3 (姓名、信箱、班級)
      Student1_Name: String(row[7] || ''),
      student1_name: String(row[7] || ''),
      Student1_Email: String(row[8] || ''),
      student1_email: String(row[8] || ''),
      Student1_Class: String(row[27] || ''),
      student1_class: String(row[27] || ''),
      Student2_Name: String(row[9] || ''),
      student2_name: String(row[9] || ''),
      Student2_Email: String(row[10] || ''),
      student2_email: String(row[10] || ''),
      Student2_Class: String(row[28] || ''),
      student2_class: String(row[28] || ''),
      Student3_Name: String(row[11] || ''),
      student3_name: String(row[11] || ''),
      Student3_Email: String(row[12] || ''),
      student3_email: String(row[12] || ''),
      Student3_Class: String(row[29] || ''),
      student3_class: String(row[29] || ''),
      // 指導教師 1~2 與主要聯絡人
      Teacher1_Name: String(row[13] || ''),
      teacher1_name: String(row[13] || ''),
      Teacher1_Email: String(row[14] || ''),
      teacher1_email: String(row[14] || ''),
      Teacher1_Phone: t1Phone,
      teacher1_phone: t1Phone,
      Teacher2_Name: String(row[15] || ''),
      teacher2_name: String(row[15] || ''),
      Teacher2_Email: String(row[16] || ''),
      teacher2_email: String(row[16] || ''),
      Teacher2_Phone: t2Phone,
      teacher2_phone: t2Phone,
      Contact_Person: String(row[17] || ''),
      contact_person: String(row[17] || ''),
      Contact_Phone: t1Phone,
      contact_phone: t1Phone,
      // 作品連結與審核/寄信紀錄
      MindMap_Link: String(row[19] || ''),
      mindmap_link: String(row[19] || ''),
      Slides_Link: String(row[20] || ''),
      slides_link: String(row[20] || ''),
      Video_Link: String(row[21] || ''),
      video_link: String(row[21] || ''),
      Consent_Link: String(row[22] || ''),
      consent_link: String(row[22] || ''),
      Course_Plan_Link: String(row[23] || ''),
      course_plan_link: String(row[23] || ''),
      Drive_Link: String(row[24] || ''),
      drive_link: String(row[24] || ''),
      Link_Note: String(row[25] || ''),
      link_note: String(row[25] || ''),
      Memo: String(row[26] || ''),
      memo: String(row[26] || '')
    };
  });

  if (targetYear) {
    teams = teams.filter(t => String(t.competition_year) === String(targetYear));
  }

  return { status: 'success', data: teams };
}

function buildTeamRowData(team, teamId, existingRow) {
  const getVal = (val, fallbackIdx) => {
    if (val !== undefined && val !== null) return val;
    if (existingRow && existingRow[fallbackIdx] !== undefined) return existingRow[fallbackIdx];
    return '';
  };

  const t1Phone = team.teacher1_phone !== undefined ? team.teacher1_phone : (team.Teacher1_Phone !== undefined ? team.Teacher1_Phone : (team.contact_phone !== undefined ? team.contact_phone : team.Contact_Phone));
  const t2Phone = team.teacher2_phone !== undefined ? team.teacher2_phone : team.Teacher2_Phone;
  const grpName = team.team_name !== undefined && team.team_name !== '' ? team.team_name : (team.group_name !== undefined ? team.group_name : team.Group_Name);

  return [
    teamId,
    getVal(team.competition_year ?? team.Competition_Year, 1) || 115,
    getVal(team.category ?? team.Category, 2),
    getVal(grpName, 3),
    getVal(team.school ?? team.School, 4),
    getVal(team.work_title ?? team.Work_Title, 5),
    getVal(team.description ?? team.Description, 6),
    getVal(team.student1_name ?? team.Student1_Name, 7),
    getVal(team.student1_email ?? team.Student1_Email, 8),
    getVal(team.student2_name ?? team.Student2_Name, 9),
    getVal(team.student2_email ?? team.Student2_Email, 10),
    getVal(team.student3_name ?? team.Student3_Name, 11),
    getVal(team.student3_email ?? team.Student3_Email, 12),
    getVal(team.teacher1_name ?? team.Teacher1_Name, 13),
    getVal(team.teacher1_email ?? team.Teacher1_Email, 14),
    getVal(team.teacher2_name ?? team.Teacher2_Name, 15),
    getVal(team.teacher2_email ?? team.Teacher2_Email, 16),
    getVal(team.contact_person ?? team.Contact_Person, 17),
    getVal(t1Phone, 18),
    getVal(team.mindmap_link ?? team.MindMap_Link, 19),
    getVal(team.slides_link ?? team.Slides_Link, 20),
    getVal(team.video_link ?? team.Video_Link, 21),
    getVal(team.consent_link ?? team.Consent_Link, 22),
    getVal(team.course_plan_link ?? team.Course_Plan_Link, 23),
    getVal(team.drive_link ?? team.Drive_Link, 24),
    getVal(team.link_note ?? team.Link_Note, 25),
    getVal(team.memo ?? team.Memo, 26),
    getVal(team.student1_class ?? team.Student1_Class, 27),
    getVal(team.student2_class ?? team.Student2_Class, 28),
    getVal(team.student3_class ?? team.Student3_Class, 29),
    getVal(t2Phone, 30)
  ];
}

function processSaveTeam(ss, payload) {
  const team = payload.team;
  if (!team) return { status: 'error', message: 'Missing team data', data: null };

  const teamSheet = ss.getSheetByName('Teams');
  if (!teamSheet) return { status: 'error', message: 'Teams sheet not found', data: null };
  ensureTeamsSheetColumns(teamSheet);

  const lastRow = teamSheet.getLastRow();
  const teamId = String(team.team_id || team.Team_ID || Utilities.getUuid()).trim();

  let rowIndex = -1;
  let existingRow = null;
  if (lastRow > 1) {
    const colCount = Math.max(teamSheet.getLastColumn(), TEAMS_HEADERS_V77.length);
    const allRows = teamSheet.getRange(2, 1, lastRow - 1, colCount).getValues();
    const foundIdx = allRows.findIndex(r => String(r[0]).trim() === teamId);
    if (foundIdx !== -1) {
      rowIndex = foundIdx + 2;
      existingRow = allRows[foundIdx];
    }
  }

  const rowData = buildTeamRowData(team, teamId, existingRow);

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
  const colCount = Math.max(teamSheet.getLastColumn(), TEAMS_HEADERS_V77.length);
  let existingRows = [];
  if (lastRow > 1) {
    existingRows = teamSheet.getRange(2, 1, lastRow - 1, colCount).getValues();
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
      foundIdx = existingRows.findIndex(r => String(r[0]).trim() === reqId);
    }
    if (foundIdx === -1 && reqSchool && (reqTitle || reqGroup)) {
      foundIdx = existingRows.findIndex(r =>
        String(r[1]) === reqYear &&
        String(r[4]).trim() === reqSchool &&
        ((reqTitle && String(r[5]).trim() === reqTitle) || (reqGroup && String(r[3]).trim() === reqGroup))
      );
    }

    if (foundIdx !== -1) {
      const existingRow = existingRows[foundIdx];
      const finalId = String(existingRow[0]);
      // 合併更新：若匯入列中某欄位為空字串，保留既有試算表內的資料（如兩階段報名與繳件合併）
      const mergedTeam = {};
      Object.keys(team).forEach(k => {
        if (team[k] !== '' && team[k] !== null && team[k] !== undefined) {
          mergedTeam[k] = team[k];
        }
      });
      const rowData = buildTeamRowData(mergedTeam, finalId, existingRow);
      teamSheet.getRange(foundIdx + 2, 1, 1, rowData.length).setValues([rowData]);
      existingRows[foundIdx] = rowData;
      updatedCount++;
    } else {
      const newId = reqId || Utilities.getUuid();
      const rowData = buildTeamRowData(team, newId, null);
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
