import discord
from discord.ext import commands
from mcstatus import JavaServer
import os
import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

intents = discord.Intents.default()
intents.message_content = True  # REQUIRED for chat reading
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents, help_command=None)

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")

def is_dev(ctx):
    return ctx.author.id == 1395464938230775902

OWNER_IDS = {
    1395464938230775902,
    1304789612694212669,
    1497211980266737684
}

async def is_allowed(ctx):
    return ctx.author.id in OWNER_IDS


bad_words = ["nigger", "niger", "niga", "fuck", "dick", "nigga", "shit", "zain", "diga", "pussy", "niggga", "badword", "damn", "bitch", "זין", "פוט", "שרמוטה", "בולבול", "תחת", "כושי", "תמות"]

# --- Daily violation tracker with escalating timeouts ---------------------
# Counts every rule violation a user commits per UTC day. When a user crosses
# DAILY_LIMIT in a single day they are timed out. The timeout length doubles
# every time the same user gets timed out, persisting across days.
VIOLATIONS_FILE = Path(__file__).with_name("violations.json")
DAILY_LIMIT = 10
INITIAL_TIMEOUT_DAYS = 1
MAX_TIMEOUT_DAYS = 28  # Discord caps member timeouts at 28 days


def _load_violations():
    if VIOLATIONS_FILE.exists():
        try:
            return json.loads(VIOLATIONS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return {}
    return {}


def _save_violations(data):
    VIOLATIONS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _today_str():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def record_violations(member, count):
    """Record `count` rule violations for `member`.

    Returns the number of days the user was timed out for, or None if the
    daily limit was not reached (or the timeout could not be applied).
    """
    if count <= 0 or member is None:
        return None

    data = _load_violations()
    key = str(member.id)
    today = _today_str()

    entry = data.get(key) or {}
    if entry.get("date") != today:
        entry["date"] = today
        entry["violations"] = 0
    entry.setdefault("timeout_days", INITIAL_TIMEOUT_DAYS)

    entry["violations"] = entry.get("violations", 0) + count

    timeout_applied = None
    if entry["violations"] >= DAILY_LIMIT:
        days = min(entry["timeout_days"], MAX_TIMEOUT_DAYS)
        try:
            until = datetime.now(timezone.utc) + timedelta(days=days)
            await member.timeout(
                until,
                reason=f"Exceeded {DAILY_LIMIT} rule violations in one day",
            )
            timeout_applied = days
        except (discord.Forbidden, discord.HTTPException, AttributeError):
            timeout_applied = None

        # Reset daily counter so they don't get re-timed-out the same day,
        # and double the next timeout length (capped at Discord's max).
        entry["violations"] = 0
        entry["timeout_days"] = min(entry["timeout_days"] * 2, MAX_TIMEOUT_DAYS)

    data[key] = entry
    _save_violations(data)
    return timeout_applied


@bot.event
async def on_message(message):
    if message.author.bot:
        return

    content = message.content.lower()

    words = re.findall(r"\b\w+\b", content)

    i = 0

    for word in words:
        if word in bad_words:
            i += 1

    if i > 0:

        await message.delete()

        if i > 1:
            await message.channel.send(
                f"{message.author.mention} you used {i} swear words IN THE SAME MESSAGE! STOP IT!"
            )

        else:
            await message.channel.send(
                f"{message.author.mention} Your message was deleted due to inappropriate language."
            )

        timeout_days = await record_violations(message.author, i)
        if timeout_days:
            await message.channel.send(
                f"{message.author.mention} has exceeded {DAILY_LIMIT} rule violations today "
                f"and has been timed out for {timeout_days} day"
                f"{'s' if timeout_days != 1 else ''}."
            )

    await bot.process_commands(message)

@bot.command()
async def ping(ctx):
    await ctx.send("Pong!")

@bot.command()
async def status(ctx):
    server = JavaServer.lookup("shark-smp.my.pebble.host")
    latency = server.ping()

    try:
        status = server.status()
        players = ", ".join([p.name for p in status.players.sample]) if status.players.sample else "No players"
        a="player"
        if status.players.online > 1 or status.players.online == 0:
            a="players"

        await ctx.send(
            f"# 🟢 Server Online at `shark-smp.my.pebble.host`\n"
            f"## {status.players.online} Online {a}\n"
            f"{f'### Player(s): {players}\n' if status.players.online else ''}"
            f"Server Version: `{status.version.name}`\n"
            f"The server replied in {round(latency)} ms"
        )

        await ctx.message.add_reaction("✅")
    except:
        await ctx.send("🔴 Server is offline")

@bot.command()
async def ip(ctx):
    server = JavaServer.lookup("shark-smp.my.pebble.host")
    status1 = server.status()
    embed = discord.Embed(
        title="Shark SMP",
        color=discord.Color.blue()
    )

    embed.add_field(
        name="IP",
        value="`shark-smp.my.pebble.host`\n",
        inline=False
    )

    embed.add_field(
        name="Version",
        value=f"`{status1.version.name}`\n",
    )

    await ctx.send(embed=embed)

    await ctx.message.add_reaction("✅")

@bot.command()
async def rules(ctx):
    embed = discord.Embed(
        title="Shark SMP Rules",
        color=discord.Color.blue()
    )

    embed.add_field(
        name="Rules",
        value="Currently no rules."
    )

    embed.set_footer(text="Rules may be added/changed in the future.")

    await ctx.send(embed=embed)

    await ctx.message.add_reaction("✅")

@bot.command(name="help")
async def help_command(ctx):
    try:
        embed = discord.Embed(
            title="Shark SMP Bot Help",
            description="Available commands:",
            color=discord.Color.blue()
        )

        embed.add_field(
            name="General",
            value="`!ping` → Check if bot is online\n"
                  "`!help` → Show this message\n"
                  "`!rules` → Show server rules\n"
                  "`!poll` → (Admin only) Create a 👍 or 👎 poll",
            inline=False
        )

        embed.add_field(
            name="Minecraft",
            value="`!status` → Show server status\n"
                  "`!ip` → Show server IP and version\n"
                  ,
            inline=False
        )

        embed.set_footer(text="More features coming soon 👀")

        await ctx.send(embed=embed)

        await ctx.message.add_reaction("✅")
    except:
        await ctx.send("No perms")


@bot.command()
@commands.check(is_allowed)
async def poll(ctx, *, question):

    await ctx.message.delete()

    embed = discord.Embed(
        title=question,
        color=discord.Color.blue()
    )

    embed.set_footer(text=f"Poll started by {ctx.author.display_name}")

    poll_message = await ctx.send(embed=embed)

    await poll_message.add_reaction("👍")
    await poll_message.add_reaction("👎")


@bot.command()
@commands.check(is_dev)
async def perms(ctx):
    perms = ctx.channel.permissions_for(ctx.guild.me)

    await ctx.send(
        f"**Bot permissions in this channel:**\n"
        f"Send Messages: {perms.send_messages}\n"
        f"Embed Links: {perms.embed_links}\n"
        f"Read Messages: {perms.read_messages}\n"
        f"Read History: {perms.read_message_history}\n"
        f"Manage Messages: {perms.manage_messages}\n"
        f"Add Reactions: {perms.add_reactions}\n"
    )

    await ctx.message.add_reaction("✅")

@bot.command()
@commands.check(is_allowed)
async def purge(ctx, amount: int):
    await ctx.channel.purge(limit=amount + 1)

bot.run(os.getenv("TOKEN"))
