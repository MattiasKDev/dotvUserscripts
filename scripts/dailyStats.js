/**
 * Author: infinity
 * Name: Daily Stats
 * Description: Displays sp and levels gained since last reset.
 */

if (JSON.parse(localStorage.getItem("scriptSettings"))?.dailyStats) main();

let lastResponse;
async function main() {
	//set up local storage for first time use
	if (localStorage.getItem("dailyStats") === null) {
		const newStats = {
			lastUpdated: "2021-01-01",
			spVal: 0,
			lvl: 0,
		};
		localStorage.setItem("dailyStats", JSON.stringify(newStats));
	}

	lastResponse = await getDailyStatChange();
	setupEventListeners();
}

async function setupEventListeners() {
	let tooltip = null;
	const avatar = document.getElementsByClassName("avatar")[0].firstChild;
	avatar.addEventListener("mouseover", () => {
		tooltip = document.createElement("div");
		tooltip.innerText = lastResponse;
		tooltip.style.position = "absolute";
		tooltip.style.backgroundColor = "black";
		tooltip.style.color = "white";
		tooltip.style.padding = "4px";
		tooltip.style.borderRadius = "4px";
		tooltip.style.zIndex = "9999";
		const avatarRect = avatar.getBoundingClientRect();
		tooltip.style.left = `${avatarRect.left + window.scrollX}px`;
		tooltip.style.top = `${avatarRect.top + window.scrollY}px`;

		tooltip.style.pointerEvents = "none";
		document.body.appendChild(tooltip);

		getDailyStatChange()
			.then((result) => {
				tooltip.innerText = result;
				lastResponse = result;
			})
			.catch((error) => {
				console.error(error);
			});
	});
	avatar.addEventListener("mouseout", () => {
		if (tooltip) {
			tooltip.remove();
			tooltip = null;
		}
	});
}

async function getDailyStatChange() {
	const data = await getUserData();
	const stats = getStatsFromData(data);
	const sp = calcSpValue(stats);

	//get yesterday's stats
	yesterdayStats = JSON.parse(localStorage.getItem("dailyStats"));

	//current utc date
	const today = new Date().toISOString().split("T")[0];

	//if the current date is greater than the last updated date, update the stored stats
	if (new Date(today) > new Date(yesterdayStats.lastUpdated)) {
		const newStats = {
			lastUpdated: today,
			spVal: sp,
			lvl: stats.level,
		};
		localStorage.setItem("dailyStats", JSON.stringify(newStats));
	}

	return `sp gained: ${sp - yesterdayStats.spVal}\nlevel gained: ${
		stats.level - yesterdayStats.lvl
	}`;
}

async function getUserData() {
	const rawData = await fetch(
		"https://api.dragonsofthevoid.com/api/user/info",
		{
			method: "GET",
			headers: { authorization: localStorage.token },
		}
	);
	const data = await rawData.json();
	return data.payload;
}

function getStatsFromData(data) {
	const spOnHand = data.inventory.items["p.stats"].qty;
	let stats = {
		constitution: 0,
		strength: 0,
		agility: 0,
		intellect: 0,
		perception: 0,
		leadership: 0,
		vitalitycap: 0,
		energycap: 0,
		honorcap: 0,
		level: 0,
	};

	let filteredStats = Object.fromEntries(
		Object.entries(data.user).filter(([key, value]) =>
			stats.hasOwnProperty(key)
		)
	);

	filteredStats.sp = spOnHand;
	return filteredStats;
}

function calcSpValue(stats) {
	let sp = 0;

	for (const [stat, value] of Object.entries(stats)) {
		if (stat === "level") {
			sp -= value;
			continue;
		}
		///TODO handle stat values >10000 here
		/*
		Starting at 10k it cost 2.
		10k to 25k every 1.5k it increases cost by 1.

		At 25k it increases by 1 every 1k
		*/

		sp += value;
	}

	return sp;
}
