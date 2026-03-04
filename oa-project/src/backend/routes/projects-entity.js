/**
 * 实体项目立项 - 对齐Excel模板字段
 */

// POST 实体项目立项（10位编号）
router.post('/entity', (req, res) => {
  try {
    const {
      name,           // 合同名称
      alias,          // 项目别名
      location,       // 项目地点
      contract_amount,// 合同含税金额（万元）
      amount_no_tax,  // 不含税金额（万元）
      tax_rate,       // 税率（%）
      tax_amount,     // 税金（万元）
      party_a,        // 甲方单位名称
      party_a_bank,   // 甲方银行信息 ⭐ 新增
      party_a_contact,// 甲方联系人
      party_a_phone,  // 甲方电话
      party_a_address,// 甲方地址 ⭐ 新增
      contract_type,  // 合同类型（采购、施工工程专业、劳务、技术服务）
      start_date,     // 开始时间
      end_date,       // 结束时间
      warranty_period,// 保修期（月）⭐ PPT要求但用户漏填
      return_plan_time,   // 回款计划时间 ⭐ 新增
      return_plan_amount, // 回款计划金额 ⭐ 新增
      payment_plans,  // 付款批次计划（数组）
      created_by
    } = req.body;

    if (!name) return res.status(400).json({ error: '合同名称不能为空' });

    const code = generateCode('entity');
    const calcTax = tax_amount || (contract_amount && tax_rate ? contract_amount * tax_rate / 100 : 0);

    // 开启事务
    const result = db.transaction(() => {
      // 插入项目
      const projectResult = db.prepare(`
        INSERT INTO projects (
          code, name, alias, type, location,
          party_a, party_a_contact, party_a_phone, party_a_bank, party_a_address,
          contract_amount, amount_no_tax, tax_rate, tax_amount, contract_type,
          start_date, end_date, warranty_period,
          return_plan_time, return_plan_amount,
          status, created_by
        ) VALUES (?, ?, ?, 'entity', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).run(code, name, alias, location,
        party_a, party_a_contact, party_a_phone, party_a_bank, party_a_address,
        contract_amount || 0, amount_no_tax || 0, tax_rate || 0, calcTax, contract_type,
        start_date, end_date, warranty_period || 0,
        return_plan_time, return_plan_amount,
        created_by);

      // 插入付款计划
      if (payment_plans && payment_plans.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO payment_plans (project_id, batch_no, planned_date, amount, plan_ratio, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        payment_plans.forEach(plan => {
          stmt.run(
            projectResult.lastInsertRowid,
            plan.batch_no,
            plan.planned_date,
            plan.amount || 0,
            plan.plan_ratio || 0,  // 付款比例 ⭐ 新增
            created_by
          );
        });
      }

      return projectResult;
    })();

    // 创建审批
    createApproval('project', result.lastInsertRowid);

    res.json({
      id: result.lastInsertRowid,
      code,
      message: '实体项目创建成功，等待审批'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '创建失败' });
  }
});
