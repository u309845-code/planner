import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { DateTime } from "luxon";
import * as db from "./db";
import { formatTime, isValidZone, parseTask } from "./parse";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Не задан BOT_TOKEN. Скопируйте .env.example в .env и вставьте токен от @BotFather.");
  process.exit(1);
}

const ownerId = process.env.OWNER_ID ? Number(process.env.OWNER_ID) : undefined;
const bot = new Bot(token);

const tz = () => db.getSetting("tz") ?? process.env.DEFAULT_TZ ?? "Europe/Moscow";

// /start доступен всем и показывает id; остальное только владельцу.
bot.command("start", async (ctx) => {
  if (ownerId === undefined) {
    await ctx.reply(
      `Ваш Telegram id: ${ctx.from?.id}\nВпишите его в .env как OWNER_ID и перезапустите бота.`,
    );
    return;
  }
  if (ctx.from?.id !== ownerId) return;
  await ctx.reply(HELP);
});

bot.use(async (ctx, next) => {
  if (ownerId !== undefined && ctx.from?.id === ownerId) await next();
});

const HELP = [
  "Я ваш планер.",
  "",
  "/add текст [когда] — добавить задачу, например:",
  "/add Купить молоко завтра в 18:00",
  "/today — задачи на сегодня",
  "/list — все невыполненные",
  "/done номер — отметить выполненной",
  "/del номер — удалить",
  "/tz Europe/Moscow — часовой пояс",
].join("\n");

bot.command("help", (ctx) => ctx.reply(HELP));

function line(t: db.Task): string {
  const when = t.remind_at ? ` — ${formatTime(t.remind_at, tz())}` : "";
  return `#${t.id} ${t.title}${when}`;
}

bot.command("add", async (ctx) => {
  const text = ctx.match.trim();
  if (!text) return ctx.reply("Напишите задачу: /add Купить молоко завтра в 18:00");
  const { title, remindAt } = parseTask(text, tz());
  if (remindAt !== null && remindAt < Date.now()) {
    return ctx.reply("Это время уже прошло. Уточните дату, например «завтра в 9:00».");
  }
  const id = db.addTask(title, remindAt);
  const when = remindAt ? `, напомню ${formatTime(remindAt, tz())}` : " (без напоминания)";
  await ctx.reply(`Добавлено #${id}: ${title}${when}`);
});

bot.command("today", async (ctx) => {
  const now = DateTime.now().setZone(tz());
  const tasks = db.listBetween(now.startOf("day").toMillis(), now.endOf("day").toMillis());
  await ctx.reply(tasks.length ? tasks.map(line).join("\n") : "На сегодня задач нет.");
});

bot.command("list", async (ctx) => {
  const tasks = db.listOpen();
  await ctx.reply(tasks.length ? tasks.map(line).join("\n") : "Задач нет.");
});

bot.command("done", async (ctx) => {
  const id = Number(ctx.match);
  if (!db.getTask(id)) return ctx.reply("Нет такой задачи. Пример: /done 3");
  db.markDone(id);
  await ctx.reply(`Готово: #${id}`);
});

bot.command("del", async (ctx) => {
  const id = Number(ctx.match);
  await ctx.reply(db.deleteTask(id) ? `Удалено: #${id}` : "Нет такой задачи. Пример: /del 3");
});

bot.command("tz", async (ctx) => {
  const zone = ctx.match.trim();
  if (!zone) return ctx.reply(`Текущий часовой пояс: ${tz()}`);
  if (!isValidZone(zone)) return ctx.reply("Неизвестный пояс. Пример: Europe/Moscow");
  db.setSetting("tz", zone);
  await ctx.reply(`Часовой пояс: ${zone}`);
});

bot.callbackQuery(/^done:(\d+)$/, async (ctx) => {
  db.markDone(Number(ctx.match[1]));
  await ctx.answerCallbackQuery("Готово");
  await ctx.editMessageText(`✅ ${ctx.callbackQuery.message?.text ?? "Выполнено"}`);
});

bot.callbackQuery(/^snooze:(\d+)$/, async (ctx) => {
  const until = Date.now() + 60 * 60 * 1000;
  db.snooze(Number(ctx.match[1]), until);
  await ctx.answerCallbackQuery("Отложено на час");
  await ctx.editMessageText(`⏰ Отложено до ${formatTime(until, tz())}`);
});

async function sendDue() {
  if (ownerId === undefined) return;
  for (const t of db.dueTasks(Date.now())) {
    try {
      await bot.api.sendMessage(ownerId, `🔔 ${t.title}`, {
        reply_markup: new InlineKeyboard()
          .text("Готово", `done:${t.id}`)
          .text("Отложить на час", `snooze:${t.id}`),
      });
      db.markNotified(t.id);
    } catch (err) {
      console.error("Не удалось отправить напоминание", t.id, err);
    }
  }
}

setInterval(sendDue, 30_000);

bot.catch((err) => console.error("Ошибка бота:", err.error));
bot.start({ onStart: (me) => console.log(`Бот @${me.username} запущен`) });
