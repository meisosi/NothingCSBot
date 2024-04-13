import { Composer } from "grammy";
import type { Context } from "#root/bot/context.js";
import { logHandle } from "#root/bot/helpers/logging.js";
import {
  caseData,
  caseOpenData,
  caseInfoData,
  casesMenuData,
} from "#root/bot/callback-data/index.js";
import { getCase } from "#root/database/schemas/cases.js";
import { getItem } from "#root/database/schemas/items.js";
import {
  createInfoMenuKeyboard,
  createOpenCaseMenuKeyboard,
  createRelaseCasesKeyboard,
} from "../keyboards/case.js";

const composer = new Composer<Context>();

const feature = composer.chatType("private");

feature.callbackQuery(
  casesMenuData.filter(),
  logHandle("keyboard-casemenu-select"),
  async (ctx) => {
    if (ctx.database === undefined) {
      return ctx.answerCallbackQuery(ctx.t("errors.no-registered-user"));
    }
    ctx.answerCallbackQuery();
    return ctx.reply(ctx.t("cases.main"), {
      reply_markup: await createRelaseCasesKeyboard(ctx),
    });
  },
);

feature.callbackQuery(
  caseData.filter(),
  logHandle("keyboard-case-select"),
  async (ctx) => {
    if (ctx.database === undefined) {
      return ctx.answerCallbackQuery(ctx.t("errors.no-registered-user"));
    }
    const { id: caseId } = caseData.unpack(ctx.callbackQuery.data);
    const box = await getCase(caseId);
    if (box === undefined) {
      return ctx.answerCallbackQuery(ctx.t("errors.no-box-found"));
    }
    ctx.answerCallbackQuery();
    return ctx.reply(
      ctx.t("cases.case-menu", {
        name: ctx.t(`${box.id}.name`),
        price: box.price,
        description: ctx.t(`${box.id}.description`),
      }),
      {
        reply_markup: await createOpenCaseMenuKeyboard(ctx, box.id),
      },
    );
  },
);

feature.callbackQuery(
  caseOpenData.filter(),
  logHandle("keyboard-caseopen-select"),
  async (ctx) => {
    if (ctx.database === undefined) {
      return ctx.answerCallbackQuery(ctx.t("errors.no-registered-user"));
    }
  },
);

feature.callbackQuery(
  caseInfoData.filter(),
  logHandle("keyboard-caseinfo-select"),
  async (ctx) => {
    if (ctx.database === undefined) {
      return ctx.answerCallbackQuery(ctx.t("errors.no-registered-user"));
    }
    const { id: caseId, page } = caseInfoData.unpack(ctx.callbackQuery.data);
    const box = await getCase(caseId);
    if (box === undefined) {
      return ctx.answerCallbackQuery(ctx.t("errors.no-box-found"));
    }
    const itemPromises = box.loot.map(async (lootId) => {
      const item = await getItem(lootId);
      if (!item) return;

      return `
        ${ctx.t("loot.skin")}: ${ctx.t(`${item.id}.name`)}
        ${ctx.t("loot.price")}: ${item.price}
        ${ctx.t("loot.quality")}: ${ctx.t(`loot.${item.rarity.toLowerCase()}`)}
        ${ctx.t("loot.chance")}: ${item.group_drop_chance}%
      `;
    });
    const descriptions = await Promise.all(itemPromises);
    const description = descriptions[page];
    if (description === undefined) {
      ctx.answerCallbackQuery();
      return ctx.reply(ctx.t("cases.case-no-info"));
    }
    ctx.answerCallbackQuery();
    return ctx.reply(
      ctx.t("cases.case-info", {
        name: ctx.t(`${box.id}.name`),
        loot: description.toString(),
      }),
      {
        reply_markup: await createInfoMenuKeyboard(ctx, caseId, page),
      },
    );
  },
);

export { composer as casesFeature };
