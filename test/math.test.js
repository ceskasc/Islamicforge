import test from "node:test";
import assert from "node:assert/strict";
import { qiblaBearing, parseTime, nextPrayer, formatCountdown, zakatEstimate } from "../math.js";

test("qibla bearing from Istanbul points southeast toward Mecca", () => {
  const angle = qiblaBearing(41.0082, 28.9784);
  assert.ok(angle > 145 && angle < 160);
  assert.equal(qiblaBearing(21.422487, 39.826206), null);
  assert.throws(() => qiblaBearing(95, 28), RangeError);
});
test("parses aladhan times and rejects malformed ones", () => {
  assert.equal(parseTime("05:47 (+03)"), 5 * 3600 + 47 * 60);
  assert.equal(parseTime("25:00"), null);
  assert.equal(parseTime("oops"), null);
});
const times = { Fajr:"05:10", Dhuhr:"12:15", Asr:"15:30", Maghrib:"18:04", Isha:"19:26" };
test("selects next prayer within day and tomorrow after Isha", () => {
  assert.deepEqual(nextPrayer(12 * 3600, times, "05:11").key, "Dhuhr");
  const tomorrow = nextPrayer(22 * 3600, times, "05:11");
  assert.equal(tomorrow.key, "Fajr");
  assert.equal(tomorrow.tomorrow, true);
  assert.equal(formatCountdown(tomorrow.seconds), "07:11:00");
});
test("never invents a next-day time when tomorrow data is missing", () => {
  assert.equal(nextPrayer(22 * 3600, times, null), null);
});
test("zakat is 2.5 percent only when nisab and lunar-year conditions are met", () => {
  assert.deepEqual(zakatEstimate({cash:100000,gold:0,goldPrice:0,other:0,debt:0,nisab:80000,year:true}), {assets:100000,net:100000,eligible:true,amount:2500});
  assert.equal(zakatEstimate({cash:100000,gold:0,goldPrice:0,other:0,debt:30000,nisab:80000,year:true}).amount, 0);
  assert.equal(zakatEstimate({cash:100000,gold:0,goldPrice:0,other:0,debt:0,nisab:80000,year:false}).amount, 0);
  assert.throws(() => zakatEstimate({cash:10,gold:0,goldPrice:0,other:0,debt:0,nisab:0,year:true}), RangeError);
  assert.throws(() => zakatEstimate({cash:-1,gold:0,goldPrice:0,other:0,debt:0,nisab:10,year:true}), RangeError);
});
