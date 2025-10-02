// controllers/surveyController.js
const { Sequelize } = require("sequelize");

const ensureDefaultTypes = async (models, t) => {
  const defaults = [
    "short_text",
    "paragraph",
    "checkbox",
    "multiple_choice",
    "date",
  ];
  const existing = await models.SurveyQuestionType.findAll({ transaction: t });
  if (existing.length === 0) {
    await models.SurveyQuestionType.bulkCreate(
      defaults.map((name) => ({ name })),
      { transaction: t }
    );
  }
};

module.exports = (models, sequelize) => {
  const { Survey, SurveyQuestion, SurveyOption, SurveyQuestionType, Meeting } =
    models;

  const sanitizeSurvey = (s) => ({
    surveyId: s.surveyId,
    meetingId: s.meetingId,
    title: s.title,
    description: s.description,
    isShow: s.isShow,
    createdAt: s.created_at || s.createdAt,
    updatedAt: s.updated_at || s.updatedAt,
    Questions: (s.Questions || []).map((q) => ({
      questionId: q.questionId,
      typeId: q.typeId,
      typeName: q.Type?.name || null,
      questionBody: q.questionBody,
      isRequired: q.isRequired,
      seq: q.seq,
      Options: (q.Options || []).map((o) => ({
        optionId: o.optionId,
        optionBody: o.optionBody,
        seq: o.seq,
      })),
    })),
  });

  return {
    // GET /api/surveys/types
    listTypes: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        await ensureDefaultTypes(models, t);
        await t.commit();

        const types = await SurveyQuestionType.findAll({
          order: [["type_questions_id", "ASC"]],
        });
        return res.json({ success: true, data: types });
      } catch (e) {
        await t.rollback();
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // GET /api/surveys/meeting/:meetingId
    getByMeeting: async (req, res) => {
      try {
        const { meetingId } = req.params;
        const rows = await Survey.findAll({
          where: { meetingId, flag: "Y" },
          include: [
            {
              model: SurveyQuestion,
              as: "Questions",
              where: { flag: "Y" },
              required: false,
              include: [
                { model: SurveyQuestionType, as: "Type" },
                {
                  model: SurveyOption,
                  as: "Options",
                  where: { flag: "Y" },
                  required: false,
                },
              ],
              order: [["seq", "ASC"]],
            },
          ],
          order: [["created_at", "DESC"]],
        });
        return res.json({ success: true, data: rows.map(sanitizeSurvey) });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // GET /api/surveys/:surveyId
    getById: async (req, res) => {
      try {
        const { surveyId } = req.params;
        const s = await Survey.findOne({
          where: { surveyId, flag: "Y" },
          include: [
            {
              model: SurveyQuestion,
              as: "Questions",
              where: { flag: "Y" },
              required: false,
              include: [
                { model: SurveyQuestionType, as: "Type" },
                {
                  model: SurveyOption,
                  as: "Options",
                  where: { flag: "Y" },
                  required: false,
                },
              ],
              order: [["seq", "ASC"]],
            },
          ],
        });
        if (!s)
          return res
            .status(404)
            .json({ success: false, message: "Survey not found" });
        return res.json({ success: true, data: sanitizeSurvey(s) });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // POST /api/surveys
    // body: { meetingId, title, description, isShow ('Y'|'N'), questions: [{ typeName|typeId, questionBody, isRequired ('Y'|'N'), seq, options: [{ optionBody, seq }] }] }
    create: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        const {
          meetingId,
          title,
          description = null,
          isShow = "N",
          questions = [],
        } = req.body || {};

        if (!meetingId) throw new Error("meetingId is required");
        if (!title || !String(title).trim())
          throw new Error("title is required");

        const meeting = await Meeting.findOne({ where: { meetingId } });
        if (!meeting) throw new Error("Meeting not found");

        await ensureDefaultTypes(models, t);

        const survey = await Survey.create(
          { meetingId, title, description, isShow },
          { transaction: t }
        );

        // create questions + options
        for (const [idx, q] of (questions || []).entries()) {
          const {
            typeId,
            typeName,
            questionBody,
            isRequired = "N",
            seq = idx + 1,
            options = [],
          } = q || {};
          if (!questionBody || !String(questionBody).trim()) continue;

          // resolve type id
          let resolvedTypeId = typeId;
          if (!resolvedTypeId && typeName) {
            const typeRow = await SurveyQuestionType.findOne({
              where: { name: typeName },
              transaction: t,
            });
            if (!typeRow) throw new Error(`Unknown question type: ${typeName}`);
            resolvedTypeId = typeRow.typeId;
          }
          if (!resolvedTypeId)
            throw new Error("questions[].typeId or typeName is required");

          const newQ = await SurveyQuestion.create(
            {
              surveyId: survey.surveyId,
              typeId: resolvedTypeId,
              questionBody,
              isRequired: isRequired === "Y" ? "Y" : "N",
              seq,
            },
            { transaction: t }
          );

          // only add options for multiple_choice / checkbox
          const typeRow = await SurveyQuestionType.findByPk(resolvedTypeId, {
            transaction: t,
          });
          const needsOptions = ["multiple_choice", "checkbox"].includes(
            typeRow?.name
          );

          if (needsOptions && Array.isArray(options)) {
            const mapped = options
              .filter((o) => o && String(o.optionBody || "").trim())
              .map((o, i) => ({
                questionId: newQ.questionId,
                optionBody: o.optionBody,
                seq: o.seq ?? i + 1,
              }));
            if (mapped.length > 0) {
              await SurveyOption.bulkCreate(mapped, { transaction: t });
            }
          }
        }

        await t.commit();

        const created = await Survey.findOne({
          where: { surveyId: survey.surveyId },
          include: [
            {
              model: SurveyQuestion,
              as: "Questions",
              include: [
                { model: SurveyQuestionType, as: "Type" },
                {
                  model: SurveyOption,
                  as: "Options",
                  where: { flag: "Y" },
                  required: false,
                },
              ],
              order: [["seq", "ASC"]],
            },
          ],
        });

        return res
          .status(201)
          .json({ success: true, data: sanitizeSurvey(created) });
      } catch (e) {
        await t.rollback();
        return res
          .status(400)
          .json({ success: false, message: e.message || e });
      }
    },

    // PUT /api/surveys/:surveyId
    // Strategi sederhana: replace seluruh daftar pertanyaan & opsi (lebih mudah aman)
    update: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        const { surveyId } = req.params;
        const { title, description = null, isShow, questions } = req.body || {};

        const survey = await Survey.findOne({
          where: { surveyId, flag: "Y" },
          transaction: t,
        });
        if (!survey) throw new Error("Survey not found");

        if (title != null) survey.title = title;
        if (description !== undefined) survey.description = description;
        if (isShow === "Y" || isShow === "N") survey.isShow = isShow;
        await survey.save({ transaction: t });

        if (Array.isArray(questions)) {
          // soft delete old questions & options
          const oldQs = await SurveyQuestion.findAll({
            where: { surveyId, flag: "Y" },
            transaction: t,
          });
          if (oldQs.length) {
            const oldQIds = oldQs.map((q) => q.questionId);
            await SurveyOption.update(
              { flag: "N" },
              { where: { questionId: oldQIds }, transaction: t }
            );
            await SurveyQuestion.update(
              { flag: "N" },
              { where: { questionId: oldQIds }, transaction: t }
            );
          }

          await ensureDefaultTypes(models, t);

          // recreate
          for (const [idx, q] of questions.entries()) {
            const {
              typeId,
              typeName,
              questionBody,
              isRequired = "N",
              seq = idx + 1,
              options = [],
            } = q || {};
            if (!questionBody || !String(questionBody).trim()) continue;

            let resolvedTypeId = typeId;
            if (!resolvedTypeId && typeName) {
              const typeRow = await SurveyQuestionType.findOne({
                where: { name: typeName },
                transaction: t,
              });
              if (!typeRow)
                throw new Error(`Unknown question type: ${typeName}`);
              resolvedTypeId = typeRow.typeId;
            }
            if (!resolvedTypeId)
              throw new Error("questions[].typeId or typeName is required");

            const newQ = await SurveyQuestion.create(
              {
                surveyId,
                typeId: resolvedTypeId,
                questionBody,
                isRequired: isRequired === "Y" ? "Y" : "N",
                seq,
              },
              { transaction: t }
            );

            const typeRow = await SurveyQuestionType.findByPk(resolvedTypeId, {
              transaction: t,
            });
            const needsOptions = ["multiple_choice", "checkbox"].includes(
              typeRow?.name
            );

            if (needsOptions && Array.isArray(options)) {
              const mapped = options
                .filter((o) => o && String(o.optionBody || "").trim())
                .map((o, i) => ({
                  questionId: newQ.questionId,
                  optionBody: o.optionBody,
                  seq: o.seq ?? i + 1,
                }));
              if (mapped.length > 0) {
                await SurveyOption.bulkCreate(mapped, { transaction: t });
              }
            }
          }
        }

        await t.commit();
        return res.json({ success: true, message: "Survey updated" });
      } catch (e) {
        await t.rollback();
        return res
          .status(400)
          .json({ success: false, message: e.message || e });
      }
    },

    // PATCH /api/surveys/:surveyId/visibility  body: { isShow: 'Y'|'N' }
    toggleVisibility: async (req, res) => {
      try {
        const { surveyId } = req.params;
        const { isShow } = req.body || {};
        if (!["Y", "N"].includes(isShow)) {
          return res
            .status(400)
            .json({ success: false, message: "isShow must be Y or N" });
        }
        const s = await Survey.findOne({ where: { surveyId, flag: "Y" } });
        if (!s)
          return res
            .status(404)
            .json({ success: false, message: "Survey not found" });
        s.isShow = isShow;
        await s.save();
        return res.json({ success: true, message: "Visibility updated" });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // DELETE /api/surveys/:surveyId (soft)
    remove: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        const { surveyId } = req.params;
        const s = await Survey.findOne({
          where: { surveyId, flag: "Y" },
          transaction: t,
        });
        if (!s)
          return res
            .status(404)
            .json({ success: false, message: "Survey not found" });

        const qs = await SurveyQuestion.findAll({
          where: { surveyId, flag: "Y" },
          transaction: t,
        });
        const qIds = qs.map((q) => q.questionId);
        if (qIds.length) {
          await SurveyOption.update(
            { flag: "N" },
            { where: { questionId: qIds }, transaction: t }
          );
          await SurveyQuestion.update(
            { flag: "N" },
            { where: { questionId: qIds }, transaction: t }
          );
        }
        await s.update({ flag: "N" }, { transaction: t });

        await t.commit();
        return res.json({ success: true, message: "Survey deleted" });
      } catch (e) {
        await t.rollback();
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // POST /api/surveys/:surveyId/questions
    addQuestion: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        const { surveyId } = req.params;
        const {
          typeId,
          typeName,
          questionBody,
          isRequired = "N",
          seq,
          options = [],
        } = req.body || {};

        const s = await Survey.findOne({ where: { surveyId, flag: "Y" } });
        if (!s) throw new Error("Survey not found");

        await ensureDefaultTypes(models, t);

        let resolvedTypeId = typeId;
        if (!resolvedTypeId && typeName) {
          const typeRow = await SurveyQuestionType.findOne({
            where: { name: typeName },
            transaction: t,
          });
          if (!typeRow) throw new Error(`Unknown question type: ${typeName}`);
          resolvedTypeId = typeRow.typeId;
        }
        if (!resolvedTypeId) throw new Error("typeId or typeName is required");
        if (!questionBody || !String(questionBody).trim())
          throw new Error("questionBody required");

        // default seq → last + 1
        let seqVal = seq;
        if (!seqVal) {
          const last = await SurveyQuestion.max("seq", {
            where: { surveyId, flag: "Y" },
            transaction: t,
          });
          seqVal = (isFinite(last) ? last : 0) + 1;
        }

        const newQ = await SurveyQuestion.create(
          {
            surveyId,
            typeId: resolvedTypeId,
            questionBody,
            isRequired: isRequired === "Y" ? "Y" : "N",
            seq: seqVal,
          },
          { transaction: t }
        );

        // options (only if type needs it)
        const typeRow = await SurveyQuestionType.findByPk(resolvedTypeId, {
          transaction: t,
        });
        const needsOptions = ["multiple_choice", "checkbox"].includes(
          typeRow?.name
        );

        if (needsOptions && Array.isArray(options) && options.length) {
          const mapped = options
            .filter((o) => o && String(o.optionBody || "").trim())
            .map((o, i) => ({
              questionId: newQ.questionId,
              optionBody: o.optionBody,
              seq: o.seq ?? i + 1,
            }));
          if (mapped.length) {
            await SurveyOption.bulkCreate(mapped, { transaction: t });
          }
        }

        await t.commit();
        return res
          .status(201)
          .json({ success: true, data: { questionId: newQ.questionId } });
      } catch (e) {
        await t.rollback();
        return res
          .status(400)
          .json({ success: false, message: e.message || e });
      }
    },

    // PUT /api/surveys/:surveyId/questions/:questionId
    updateQuestion: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        const { surveyId, questionId } = req.params;
        const { typeId, typeName, questionBody, isRequired, seq, options } =
          req.body || {};

        const q = await SurveyQuestion.findOne({
          where: { questionId, surveyId, flag: "Y" },
          transaction: t,
        });
        if (!q) throw new Error("Question not found");

        await ensureDefaultTypes(models, t);

        if (typeId || typeName) {
          let resolvedTypeId = typeId;
          if (!resolvedTypeId && typeName) {
            const typeRow = await SurveyQuestionType.findOne({
              where: { name: typeName },
              transaction: t,
            });
            if (!typeRow) throw new Error(`Unknown question type: ${typeName}`);
            resolvedTypeId = typeRow.typeId;
          }
          q.typeId = resolvedTypeId;
        }

        if (questionBody != null) q.questionBody = questionBody;
        if (isRequired === "Y" || isRequired === "N") q.isRequired = isRequired;
        if (Number.isInteger(seq)) q.seq = seq;

        await q.save({ transaction: t });

        // replace options if provided and type needs options
        if (Array.isArray(options)) {
          await SurveyOption.update(
            { flag: "N" },
            { where: { questionId }, transaction: t }
          );

          const typeRow = await SurveyQuestionType.findByPk(q.typeId, {
            transaction: t,
          });
          const needsOptions = ["multiple_choice", "checkbox"].includes(
            typeRow?.name
          );

          if (needsOptions) {
            const mapped = options
              .filter((o) => o && String(o.optionBody || "").trim())
              .map((o, i) => ({
                questionId,
                optionBody: o.optionBody,
                seq: o.seq ?? i + 1,
              }));
            if (mapped.length)
              await SurveyOption.bulkCreate(mapped, { transaction: t });
          }
        }

        await t.commit();
        return res.json({ success: true, message: "Question updated" });
      } catch (e) {
        await t.rollback();
        return res
          .status(400)
          .json({ success: false, message: e.message || e });
      }
    },

    // DELETE /api/surveys/:surveyId/questions/:questionId
    deleteQuestion: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        const { surveyId, questionId } = req.params;
        const q = await SurveyQuestion.findOne({
          where: { questionId, surveyId, flag: "Y" },
          transaction: t,
        });
        if (!q)
          return res
            .status(404)
            .json({ success: false, message: "Question not found" });

        await SurveyOption.update(
          { flag: "N" },
          { where: { questionId }, transaction: t }
        );
        await q.update({ flag: "N" }, { transaction: t });

        await t.commit();
        return res.json({ success: true, message: "Question deleted" });
      } catch (e) {
        await t.rollback();
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    submitResponses: async (req, res) => {
      const t = await sequelize.transaction();
      try {
        const {
          Survey,
          SurveyQuestion,
          SurveyOption,
          SurveyQuestionType,
          SurveyResponse,
          SurveyResponseAnswer,
        } = models;

        const { surveyId } = req.params;
        const { meetingId: meetingIdBody, responses = [] } = req.body || {};
        const userId = req.user?.id || req.user?.userId || null;

        // 1) survey
        const survey = await Survey.findOne({
          where: { surveyId, flag: "Y" },
          transaction: t,
        });
        if (!survey) throw new Error("Survey not found");

        const meetingId = meetingIdBody || survey.meetingId;
        if (!meetingId) throw new Error("meetingId is required");

        // 2) ambil semua pertanyaan survey + type + options
        const qs = await SurveyQuestion.findAll({
          where: { surveyId, flag: "Y" },
          include: [
            { model: SurveyQuestionType, as: "Type" },
            {
              model: SurveyOption,
              as: "Options",
              where: { flag: "Y" },
              required: false,
            },
          ],
          transaction: t,
          order: [["seq", "ASC"]],
        });

        if (!qs.length) throw new Error("Survey has no questions");

        const qMap = new Map(qs.map((q) => [q.questionId, q]));

        // 3) Jika sudah ada respons aktif user ini → soft-delete dulu (biar satu aktif)
        if (userId) {
          const prev = await SurveyResponse.findAll({
            where: { surveyId, userId, flag: "Y" },
            transaction: t,
          });
          if (prev.length) {
            const prevIds = prev.map((r) => r.responseId);
            await SurveyResponseAnswer.update(
              { flag: "N" },
              { where: { responseId: prevIds }, transaction: t }
            );
            await SurveyResponse.update(
              { flag: "N" },
              { where: { responseId: prevIds }, transaction: t }
            );
          }
        }

        // 4) Buat header response
        const header = await models.SurveyResponse.create(
          { surveyId, meetingId, userId, flag: "Y", submittedAt: new Date() },
          { transaction: t }
        );

        // 5) Validasi & simpan item jawaban
        for (const item of responses) {
          const questionId = item?.questionId ?? item?.id;
          const value = item?.value;
          const q = qMap.get(Number(questionId));
          if (!q) continue; // lewati questionId yang tidak valid

          const typeName = (q.Type?.name || "").toLowerCase();

          // Required check sederhana
          const isRequired = q.isRequired === "Y";
          if (isRequired) {
            if (["short_text", "paragraph", "date"].includes(typeName)) {
              if (value == null || String(value).trim() === "")
                throw new Error(`Jawaban wajib untuk: ${q.questionBody}`);
            }
            if (typeName === "multiple_choice" && !value)
              throw new Error(`Harap pilih opsi untuk: ${q.questionBody}`);
            if (
              typeName === "checkbox" &&
              (!Array.isArray(value) || value.length === 0)
            )
              throw new Error(
                `Harap pilih minimal satu untuk: ${q.questionBody}`
              );
          }

          // Simpan sesuai tipe
          if (typeName === "short_text" || typeName === "paragraph") {
            await SurveyResponseAnswer.create(
              {
                responseId: header.responseId,
                questionId: q.questionId,
                answerText: String(value ?? ""),
              },
              { transaction: t }
            );
          } else if (typeName === "date") {
            const dateVal = value ? new Date(value) : null;
            await SurveyResponseAnswer.create(
              {
                responseId: header.responseId,
                questionId: q.questionId,
                answerDate: dateVal,
              },
              { transaction: t }
            );
          } else if (typeName === "multiple_choice") {
            // value = optionId
            const opt = (q.Options || []).find(
              (o) => String(o.optionId) === String(value)
            );
            if (!opt)
              throw new Error(`Opsi tidak valid pada: ${q.questionBody}`);
            await SurveyResponseAnswer.create(
              {
                responseId: header.responseId,
                questionId: q.questionId,
                selectedOptionId: opt.optionId,
              },
              { transaction: t }
            );
          } else if (typeName === "checkbox") {
            // value = [optionId, ...]
            const arr = Array.isArray(value) ? value : [];
            const validIds = new Set(
              (q.Options || []).map((o) => String(o.optionId))
            );
            const clean = arr.filter((v) => validIds.has(String(v)));
            await SurveyResponseAnswer.create(
              {
                responseId: header.responseId,
                questionId: q.questionId,
                selectedOptionIds: JSON.stringify(clean),
              },
              { transaction: t }
            );
          } else {
            // fallback → simpan sebagai text
            await SurveyResponseAnswer.create(
              {
                responseId: header.responseId,
                questionId: q.questionId,
                answerText: value != null ? String(value) : null,
              },
              { transaction: t }
            );
          }
        }

        await t.commit();
        return res.status(201).json({
          success: true,
          message: "Responses saved",
          data: { responseId: header.responseId },
        });
      } catch (e) {
        await t.rollback();
        return res
          .status(400)
          .json({ success: false, message: e.message || e });
      }
    },

    getMyResponse: async (req, res) => {
      try {
        const { SurveyResponse, SurveyResponseAnswer } = models;
        const { surveyId } = req.params;
        const userId = req.user?.id || req.user?.userId || null;

        if (!userId) {
          return res.status(200).json({ success: true, data: null }); // anonim belum ada
        }

        const header = await SurveyResponse.findOne({
          where: { surveyId, userId, flag: "Y" },
          include: [{ model: SurveyResponseAnswer, as: "Answers" }],
          order: [
            [
              { model: SurveyResponseAnswer, as: "Answers" },
              "created_at",
              "ASC",
            ],
          ],
        });

        if (!header) {
          return res.json({ success: true, data: null });
        }

        const shaped = {
          responseId: header.responseId,
          submittedAt: header.submittedAt || header.createdAt,
          answers: (header.Answers || []).map((a) => ({
            questionId: a.questionId,
            answerText: a.answerText,
            answerDate: a.answerDate,
            selectedOptionId: a.selectedOptionId,
            selectedOptionIds: a.selectedOptionIds
              ? JSON.parse(a.selectedOptionIds)
              : [],
          })),
        };

        return res.json({ success: true, data: shaped });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },

    // === LIST RESPONSES (HOST/ADMIN ONLY) ===
    // GET /api/surveys/:surveyId/responses
    listResponses: async (req, res) => {
      try {
        const {
          Survey,
          SurveyQuestion,
          SurveyOption,
          SurveyQuestionType,
          SurveyResponse,
          SurveyResponseAnswer,
          User,
        } = models;
        const { surveyId } = req.params;

        // izin hanya host/admin
        const role = (req.user?.role || "").toLowerCase();
        if (!["host", "admin"].includes(role)) {
          return res
            .status(403)
            .json({ success: false, message: "Forbidden: host/admin only" });
        }

        // Ambil pertanyaan²
        const survey = await Survey.findOne({
          where: { surveyId, flag: "Y" },
          include: [
            {
              model: SurveyQuestion,
              as: "Questions",
              where: { flag: "Y" },
              required: false,
              include: [
                { model: SurveyQuestionType, as: "Type" },
                {
                  model: SurveyOption,
                  as: "Options",
                  where: { flag: "Y" },
                  required: false,
                },
              ],
              order: [["seq", "ASC"]],
            },
          ],
        });
        if (!survey)
          return res
            .status(404)
            .json({ success: false, message: "Survey not found" });

        const optionById = new Map();
        for (const q of survey.Questions || []) {
          for (const o of q.Options || []) {
            optionById.set(String(o.optionId), o.optionBody || "");
          }
        }

        const questions = (survey.Questions || [])
          .slice()
          .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
          .map((q) => ({
            questionId: q.questionId,
            text: q.questionBody,
            type: (q.Type?.name || "").toLowerCase(),
            seq: q.seq ?? 0,
          }));

        // Ambil semua respons + answers + user (username saja)
        const responses = await SurveyResponse.findAll({
          where: { surveyId, flag: "Y" },
          include: [
            {
              model: SurveyResponseAnswer,
              as: "Answers",
              where: { flag: "Y" },
              required: false,
              include: [
                { model: SurveyOption, as: "SelectedOption", required: false },
              ],
            },
            // ⬇️ ambil hanya username, jangan minta 'userId' untuk menghindari kolom tidak dikenal
            {
              model: User,
              as: "User",
              attributes: ["username"],
              required: false,
            },
          ],
          order: [["submitted_at", "DESC"]],
        });

        // Bentuk map jawaban per pertanyaan
        const shaped = responses.map((r) => {
          const ansMap = {};
          for (const a of r.Answers || []) {
            const qid = a.questionId;
            // utamakan label opsi / list opsi; fallback ke text / date
            let text = null;
            if (a.selectedOptionId && a.SelectedOption) {
              text = a.SelectedOption.optionBody || null;
            } else if (a.selectedOptionIds) {
              try {
                const arr = JSON.parse(a.selectedOptionIds);
                if (Array.isArray(arr)) {
                  const labels = arr.map(
                    (id) => optionById.get(String(id)) || String(id)
                  );
                  text = labels.join(", ");
                } else {
                  text = String(a.selectedOptionIds);
                }
              } catch {
                text = String(a.selectedOptionIds);
              }
            } else if (a.answerText != null) {
              text = a.answerText;
            } else if (a.answerDate != null) {
              text = String(a.answerDate);
            }
            ansMap[qid] = { text };
          }

          return {
            responseId: r.responseId,
            userId: r.userId ?? null, // dari header response
            username: r.User?.username || null, // dari relasi User
            submittedAt: r.submittedAt,
            answers: ansMap,
          };
        });

        return res.json({
          success: true,
          data: { questions, responses: shaped },
        });
      } catch (e) {
        return res
          .status(500)
          .json({ success: false, message: e.message || e });
      }
    },
    // === DOWNLOAD CSV (HOST/ADMIN ONLY) ===
    // GET /api/surveys/:surveyId/responses.csv
    exportResponsesCSV: async (req, res) => {
      try {
        const {
          SurveyQuestion,
          SurveyResponse,
          SurveyResponseAnswer,
          SurveyOption,
          User,
        } = models;
        const { surveyId } = req.params;

        const role = (req.user?.role || "").toLowerCase();
        if (!["host", "admin"].includes(role)) {
          return res
            .status(403)
            .json({ success: false, message: "Forbidden: host/admin only" });
        }

        // Pertanyaan + Options (untuk kamus)
        const questions = await SurveyQuestion.findAll({
          where: { surveyId, flag: "Y" },
          order: [["seq", "ASC"]],
          include: [
            {
              model: SurveyOption,
              as: "Options",
              where: { flag: "Y" },
              required: false,
            },
          ],
        });

        // Kamus optionId -> label
        const optionById = new Map();
        for (const q of questions) {
          for (const o of q.Options || []) {
            optionById.set(String(o.optionId), o.optionBody || "");
          }
        }

        // Responses
        const rows = await SurveyResponse.findAll({
          where: { surveyId, flag: "Y" },
          include: [
            {
              model: SurveyResponseAnswer,
              as: "Answers",
              where: { flag: "Y" },
              required: false,
              include: [
                { model: SurveyOption, as: "SelectedOption", required: false },
              ],
            },
            {
              model: User,
              as: "User",
              attributes: ["username"],
              required: false,
            },
          ],
          order: [["submitted_at", "DESC"]],
        });

        const csvEscape = (v) => {
          if (v == null) return "";
          const s = String(v);
          if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        };

        const header = [
          "responseId",
          "username",
          "submittedAt",
          ...questions.map((q) => q.questionBody),
        ];
        const lines = [header.map(csvEscape).join(",")];

        for (const r of rows) {
          const ansByQ = {};
          for (const a of r.Answers || []) {
            let text = null;
            if (a.selectedOptionId && a.SelectedOption) {
              text = a.SelectedOption.optionBody || null;
            } else if (a.selectedOptionIds) {
              try {
                const arr = JSON.parse(a.selectedOptionIds);
                if (Array.isArray(arr)) {
                  const labels = arr.map(
                    (id) => optionById.get(String(id)) || String(id)
                  );
                  text = labels.join("; ");
                } else {
                  text = String(a.selectedOptionIds);
                }
              } catch {
                text = String(a.selectedOptionIds);
              }
            } else if (a.answerText != null) {
              text = a.answerText;
            } else if (a.answerDate != null) {
              text = String(a.answerDate);
            }
            ansByQ[a.questionId] = text;
          }

          const row = [
            r.responseId,
            r.User?.username ?? `User-${r.userId ?? "-"}`,
            r.submittedAt?.toISOString?.() || r.submittedAt,
            ...questions.map((q) => ansByQ[q.questionId] ?? ""),
          ];
          lines.push(row.map(csvEscape).join(","));
        }

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="survey-${surveyId}-responses.csv"`
        );
        return res.send(lines.join("\n"));
      } catch (e) {
        return res.status(500).send(`Error: ${e.message || e}`);
      }
    },
  };
};
