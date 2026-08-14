import mysql from "mysql2/promise";

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Iniciando remapeamento sequencial de IDs...");

  await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

  try {
    // 1. Users
    const [users] = await connection.query("SELECT id FROM `users` ORDER BY id ASC");
    const userMap = new Map();
    let uSeq = 1;
    for (const row of users) {
      userMap.set(row.id, uSeq++);
    }
    for (const [oldId, newId] of userMap.entries()) {
      if (oldId !== newId) {
        await connection.query("UPDATE `users` SET id = ? WHERE id = ?", [newId * 1000000 + 1, oldId]);
      }
    }
    for (const [oldId, newId] of userMap.entries()) {
      if (oldId !== newId) {
        await connection.query("UPDATE `users` SET id = ? WHERE id = ?", [newId, oldId * 1000000 + 1]);
      }
    }
    console.log(`Utilizadores remapeados: ${users.length}`);

    // 2. Members
    const [members] = await connection.query("SELECT id FROM `members` ORDER BY id ASC");
    const memberMap = new Map();
    let mSeq = 1;
    for (const row of members) {
      memberMap.set(row.id, mSeq++);
    }
    for (const [oldId, newId] of memberMap.entries()) {
      if (oldId !== newId) {
        await connection.query("UPDATE `members` SET id = ? WHERE id = ?", [newId * 1000000 + 1, oldId]);
      }
    }
    for (const [oldId, newId] of memberMap.entries()) {
      if (oldId !== newId) {
        await connection.query("UPDATE `members` SET id = ? WHERE id = ?", [newId, oldId * 1000000 + 1]);
      }
    }
    const [allMembers] = await connection.query("SELECT id, guestOf FROM `members`");
    for (const m of allMembers) {
      if (m.guestOf && memberMap.has(m.guestOf)) {
        await connection.query("UPDATE `members` SET guestOf = ? WHERE id = ?", [memberMap.get(m.guestOf), m.id]);
      }
    }
    console.log(`Membros remapeados: ${members.length}`);

    // 3. Groups
    const [groups] = await connection.query("SELECT id FROM `groups` ORDER BY id ASC");
    const groupMap = new Map();
    let gSeq = 1;
    for (const row of groups) {
      groupMap.set(row.id, gSeq++);
    }
    for (const [oldId, newId] of groupMap.entries()) {
      if (oldId !== newId) {
        await connection.query("UPDATE `groups` SET id = ? WHERE id = ?", [newId * 1000000 + 1, oldId]);
      }
    }
    for (const [oldId, newId] of groupMap.entries()) {
      if (oldId !== newId) {
        await connection.query("UPDATE `groups` SET id = ? WHERE id = ?", [newId, oldId * 1000000 + 1]);
      }
    }
    for (const m of allMembers) {
      const [dbMember] = await connection.query("SELECT groupId FROM `members` WHERE id = ?", [m.id]);
      if (dbMember[0] && dbMember[0].groupId && groupMap.has(dbMember[0].groupId)) {
        await connection.query("UPDATE `members` SET groupId = ? WHERE id = ?", [groupMap.get(dbMember[0].groupId), m.id]);
      }
    }
    console.log(`Grupos remapeados: ${groups.length}`);

    // 4. Activities
    const [activities] = await connection.query("SELECT id FROM `activities` ORDER BY id ASC");
    const actMap = new Map();
    let aSeq = 1;
    for (const row of activities) {
      actMap.set(row.id, aSeq++);
    }
    for (const [oldId, newId] of actMap.entries()) {
      if (oldId !== newId) {
        await connection.query("UPDATE `activities` SET id = ? WHERE id = ?", [newId * 1000000 + 1, oldId]);
      }
    }
    for (const [oldId, newId] of actMap.entries()) {
      if (oldId !== newId) {
        await connection.query("UPDATE `activities` SET id = ? WHERE id = ?", [newId, oldId * 1000000 + 1]);
      }
    }
    console.log(`Atividades remapeadas: ${activities.length}`);

    // 5. Demais tabelas
    const tables = [
      "quotas", "otherIncome", "expenses", "transfers", "attendance",
      "commissionMembers", "activityDocuments", "reports", "memberHistory",
      "louvorMembers", "louvorScales", "auditLog", "backupVersions",
      "backupSchedules", "securityIncidents"
    ];

    for (const tableName of tables) {
      const [rows] = await connection.query(`SELECT id FROM \`${tableName}\` ORDER BY id ASC`);
      let seq = 1;
      const map = new Map();
      for (const row of rows) {
        map.set(row.id, seq++);
      }
      for (const [oldId, newId] of map.entries()) {
        if (oldId !== newId) {
          await connection.query(`UPDATE \`${tableName}\` SET id = ? WHERE id = ?`, [newId * 1000000 + 1, oldId]);
        }
      }
      for (const [oldId, newId] of map.entries()) {
        if (oldId !== newId) {
          await connection.query(`UPDATE \`${tableName}\` SET id = ? WHERE id = ?`, [newId, oldId * 1000000 + 1]);
        }
      }
      console.log(`Tabela ${tableName} remapeada: ${rows.length} registos`);
    }

    // Actualizar chaves estrangeiras
    const [quotas] = await connection.query("SELECT id, memberId, paidBy FROM `quotas`");
    for (const q of quotas) {
      const newMem = memberMap.get(q.memberId) || q.memberId;
      const newUsr = userMap.get(q.paidBy) || q.paidBy;
      await connection.query("UPDATE `quotas` SET memberId = ?, paidBy = ? WHERE id = ?", [newMem, newUsr, q.id]);
    }

    const [incomes] = await connection.query("SELECT id, recordedBy FROM `otherIncome`");
    for (const inc of incomes) {
      const newUsr = userMap.get(inc.recordedBy) || inc.recordedBy;
      await connection.query("UPDATE `otherIncome` SET recordedBy = ? WHERE id = ?", [newUsr, inc.id]);
    }

    const [expenses] = await connection.query("SELECT id, recordedBy FROM `expenses`");
    for (const exp of expenses) {
      const newUsr = userMap.get(exp.recordedBy) || exp.recordedBy;
      await connection.query("UPDATE `expenses` SET recordedBy = ? WHERE id = ?", [newUsr, exp.id]);
    }

    const [transfers] = await connection.query("SELECT id, memberId, fromGroupId, toGroupId, approvedBy FROM `transfers`");
    for (const tr of transfers) {
      const newMem = memberMap.get(tr.memberId) || tr.memberId;
      const newFg = tr.fromGroupId ? (groupMap.get(tr.fromGroupId) || tr.fromGroupId) : null;
      const newTg = tr.toGroupId ? (groupMap.get(tr.toGroupId) || tr.toGroupId) : null;
      const newUsr = tr.approvedBy ? (userMap.get(tr.approvedBy) || tr.approvedBy) : null;
      await connection.query("UPDATE `transfers` SET memberId = ?, fromGroupId = ?, toGroupId = ?, approvedBy = ? WHERE id = ?", [newMem, newFg, newTg, newUsr, tr.id]);
    }

    const [attendance] = await connection.query("SELECT id, activityId, memberId, recordedBy FROM `attendance`");
    for (const att of attendance) {
      const newAct = actMap.get(att.activityId) || att.activityId;
      const newMem = memberMap.get(att.memberId) || att.memberId;
      const newUsr = att.recordedBy ? (userMap.get(att.recordedBy) || att.recordedBy) : null;
      await connection.query("UPDATE `attendance` SET activityId = ?, memberId = ?, recordedBy = ? WHERE id = ?", [newAct, newMem, newUsr, att.id]);
    }

    const [comms] = await connection.query("SELECT id, activityId, memberId FROM `commissionMembers`");
    for (const c of comms) {
      const newAct = actMap.get(c.activityId) || c.activityId;
      const newMem = memberMap.get(c.memberId) || c.memberId;
      await connection.query("UPDATE `commissionMembers` SET activityId = ?, memberId = ? WHERE id = ?", [newAct, newMem, c.id]);
    }

    const [docs] = await connection.query("SELECT id, activityId, uploadedBy FROM `activityDocuments`");
    for (const d of docs) {
      const newAct = actMap.get(d.activityId) || d.activityId;
      const newUsr = userMap.get(d.uploadedBy) || d.uploadedBy;
      await connection.query("UPDATE `activityDocuments` SET activityId = ?, uploadedBy = ? WHERE id = ?", [newAct, newUsr, d.id]);
    }

    const [reports] = await connection.query("SELECT id, activityId, generatedBy FROM `reports`");
    for (const r of reports) {
      const newAct = actMap.get(r.activityId) || r.activityId;
      const newUsr = userMap.get(r.generatedBy) || r.generatedBy;
      await connection.query("UPDATE `reports` SET activityId = ?, generatedBy = ? WHERE id = ?", [newAct, newUsr, r.id]);
    }

    const [hist] = await connection.query("SELECT id, memberId FROM `memberHistory`");
    for (const h of hist) {
      const newMem = memberMap.get(h.memberId) || h.memberId;
      await connection.query("UPDATE `memberHistory` SET memberId = ? WHERE id = ?", [newMem, h.id]);
    }

    const [louvMem] = await connection.query("SELECT id, memberId FROM `louvorMembers`");
    for (const lm of louvMem) {
      const newMem = lm.memberId ? (memberMap.get(lm.memberId) || lm.memberId) : null;
      await connection.query("UPDATE `louvorMembers` SET memberId = ? WHERE id = ?", [newMem, lm.id]);
    }

    const [louvScales] = await connection.query("SELECT id, activityId FROM `louvorScales`");
    for (const ls of louvScales) {
      const newAct = actMap.get(ls.activityId) || ls.activityId;
      await connection.query("UPDATE `louvorScales` SET activityId = ? WHERE id = ?", [newAct, ls.id]);
    }

    const [audits] = await connection.query("SELECT id, userId FROM `auditLog`");
    for (const au of audits) {
      const newUsr = userMap.get(au.userId) || au.userId;
      await connection.query("UPDATE `auditLog` SET userId = ? WHERE id = ?", [newUsr, au.id]);
    }

    const [bVers] = await connection.query("SELECT id, createdBy FROM `backupVersions`");
    for (const bv of bVers) {
      const newUsr = userMap.get(bv.createdBy) || bv.createdBy;
      await connection.query("UPDATE `backupVersions` SET createdBy = ? WHERE id = ?", [newUsr, bv.id]);
    }

    const [bSched] = await connection.query("SELECT id, createdBy FROM `backupSchedules`");
    for (const bs of bSched) {
      const newUsr = userMap.get(bs.createdBy) || bs.createdBy;
      await connection.query("UPDATE `backupSchedules` SET createdBy = ? WHERE id = ?", [newUsr, bs.id]);
    }

    const [secInc] = await connection.query("SELECT id, createdBy FROM `securityIncidents`");
    for (const si of secInc) {
      const newUsr = userMap.get(si.createdBy) || si.createdBy;
      await connection.query("UPDATE `securityIncidents` SET createdBy = ? WHERE id = ?", [newUsr, si.id]);
    }

    console.log("Remapeamento sequencial concluído com sucesso!");
  } catch (err) {
    console.error("Erro durante o remapeamento:", err);
    throw err;
  } finally {
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
    await connection.end();
  }
}

run().catch(() => process.exit(1));
