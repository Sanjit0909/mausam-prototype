/**
 * Presentation-layer localization for alert titles/descriptions and WhyThis reasons.
 * Does NOT mutate backend/IMD payloads — callers keep the raw alert and only display the result.
 */

/** Longer phrases first so replacements don't truncate multi-word hazards. */
const HAZARD_PHRASES: Array<[RegExp, string]> = [
  [/Thunderstorm\s*&\s*Lightning,\s*Squall etc/gi, "आंधी-तूफान और बिजली"],
  [/Thunderstorms with Hail/gi, "ओलों के साथ आंधी-तूफान"],
  [/Extremely Heavy Rain/gi, "अत्यंत भारी वर्षा"],
  [/Very Heavy Rain/gi, "बहुत भारी वर्षा"],
  [/Heavy Rain Likely/gi, "भारी वर्षा की संभावना"],
  [/Heavy Rain/gi, "भारी वर्षा"],
  [/Heavy Snow/gi, "भारी बर्फबारी"],
  [/Light rain/gi, "हल्की बारिश"],
  [/Moderate rain/gi, "मध्यम बारिश"],
  [/Dust Raising Winds/gi, "धूल उड़ाने वाली हवाएँ"],
  [/Strong Surface Winds/gi, "तेज़ सतह हवाएँ"],
  [/Strong Winds/gi, "तेज़ हवाएँ"],
  [/High Wind Warning/gi, "तेज़ हवा की चेतावनी"],
  [/Dust Storm/gi, "धूल भरी आँधी"],
  [/Hailstorm/gi, "ओलावृष्टि"],
  [/Heat Wave/gi, "लू"],
  [/Extreme Heat Advisory/gi, "अत्यधिक गर्मी की सलाह"],
  [/Extreme Heat/gi, "अत्यधिक गर्मी"],
  [/Heat Advisory/gi, "गर्मी की सलाह"],
  [/Hot Day/gi, "गर्म दिन"],
  [/Warm Night/gi, "गर्म रात"],
  [/Cold Wave/gi, "शीत लहर"],
  [/Cold Weather Advisory/gi, "ठंड की सलाह"],
  [/Cold Day/gi, "ठंडा दिन"],
  [/Ground Frost/gi, "पाला"],
  [/Poor Air Quality/gi, "खराब वायु गुणवत्ता"],
  [/Air Quality Alert/gi, "वायु गुणवत्ता चेतावनी"],
  [/Flood Risk/gi, "बाढ़ का खतरा"],
  [/Visibility Reduced/gi, "दृश्यता कम है"],
  [/Reduced visibility/gi, "दृश्यता कम"],
  [/Fog Advisory/gi, "कोहरे की सलाह"],
  [/Thunderstorm Alert/gi, "आंधी-तूफान चेतावनी"],
  [/Thunderstorm/gi, "आंधी-तूफान"],
  [/High UV Index/gi, "उच्च UV सूचकांक"],
  [/No Warning/gi, "कोई चेतावनी नहीं"],
  [/Official Warning/gi, "आधिकारिक चेतावनी"],
];

const TITLE_EXACT: Record<string, string> = {
  "Extreme Heat Advisory": "अत्यधिक गर्मी की सलाह",
  "Heat Advisory": "गर्मी की सलाह",
  "Cold Weather Advisory": "ठंड की सलाह",
  "High Wind Warning": "तेज़ हवा की चेतावनी",
  "Thunderstorm Alert": "आंधी-तूफान चेतावनी",
  "Fog Advisory": "कोहरे की सलाह",
  "High UV Index": "उच्च UV सूचकांक",
  "Heavy Rain Likely": "भारी वर्षा की संभावना",
  "Heavy Rain": "भारी वर्षा",
  "Strong Winds": "तेज़ हवाएँ",
  "Extreme Heat": "अत्यधिक गर्मी",
  "Poor Air Quality": "खराब वायु गुणवत्ता",
  "Flood Risk": "बाढ़ का खतरा",
  "Visibility Reduced": "दृश्यता कम है",
  "Best Time to Exercise": "व्यायाम का सबसे अच्छा समय",
  "Packing Suggestion": "सामान पैक करने का सुझाव",
  "School Commute": "स्कूल आवागमन",
  "Field Conditions": "खेत की स्थिति",
  "Beach & Marine Outlook": "समुद्र तट और समुद्री पूर्वानुमान",
  "Commute Outlook": "यात्रा पूर्वानुमान",
  "Outdoor Event Comfort": "बाहरी कार्यक्रम आराम",
  "Health Advisory": "स्वास्थ्य सलाह",
  "Wellness Check": "स्वास्थ्य जाँच",
};

type DescRule = {
  re: RegExp;
  hi: (...m: string[]) => string;
};

const DESCRIPTION_RULES: DescRule[] = [
  {
    re: /^(\d+)% chance of rain today in (.+)\. Carry an umbrella and allow extra travel time\.$/i,
    hi: (_full, pct, loc) =>
      `आज ${loc} में बारिश की संभावना ${pct}% है। छाता साथ रखें और यात्रा के लिए अतिरिक्त समय रखें।`,
  },
  {
    re: /^Carry an umbrella after (.+) — rain is likely this evening\.$/i,
    hi: (_full, when) => {
      const clock = when.replace(/\s*(AM|PM)\s*/i, "").trim();
      const isPm = /pm/i.test(when);
      return isPm
        ? `शाम ${clock} बजे के बाद छाता साथ रखें — आज शाम बारिश की संभावना है।`
        : `${when} के बाद छाता साथ रखें — आज शाम बारिश की संभावना है।`;
    },
  },
  {
    re: /^Good time for outdoor exercise — UV and conditions look favorable\.$/i,
    hi: () => "बाहर व्यायाम का अच्छा समय है — UV और स्थितियाँ अनुकूल दिख रही हैं।",
  },
  {
    re: /^It's (.+?) — stay hydrated and avoid peak midday sun\.$/i,
    hi: (_full, temp) => `${temp} है — पानी पिएँ और दोपहर की तेज़ धूप से बचें।`,
  },
  {
    re: /^Temperature extremes today \((.+?)\) — check on elderly family members and limit their time outdoors\.$/i,
    hi: (_full, temp) =>
      `आज तापमान चरम पर है (${temp}) — वरिष्ठ परिवार सदस्यों का ध्यान रखें और उनका बाहर रहना सीमित करें।`,
  },
  {
    re: /^Winds at (.+?) — check local advisories before heading out on the water\.$/i,
    hi: (_full, wind) => `${wind} हवा है — पानी पर जाने से पहले स्थानीय सलाह जाँचें।`,
  },
  {
    re: /^Low temperatures tonight — consider frost protection for sensitive crops\.$/i,
    hi: () => "आज रात तापमान कम है — संवेदनशील फसलों के लिए पाला सुरक्षा पर विचार करें।",
  },
  {
    re: /^Conditions in (.+) look stable — a good day to plan ahead\.$/i,
    hi: (_full, loc) => `${loc} में स्थितियाँ स्थिर दिख रही हैं — आगे की योजना के लिए अच्छा दिन है।`,
  },
  {
    re: /^(.+) looks most comfortable based on current temperature and UV\.$/i,
    hi: (_full, when) => {
      const mapped = when
        .replace(/early morning \(6-8 AM\)/i, "सुबह जल्दी (6-8 बजे)")
        .replace(/any time today/i, "आज किसी भी समय");
      return `${mapped} वर्तमान तापमान और UV के आधार पर सबसे आरामदायक लगता है।`;
    },
  },
  {
    re: /^Pack a compact umbrella or raincoat\.$/i,
    hi: () => "एक छोटा छाता या रेनकोट साथ रखें।",
  },
  {
    re: /^Pack light — no rain expected right now\.$/i,
    hi: () => "हल्का सामान पैक करें — अभी बारिश की उम्मीद नहीं।",
  },
  {
    re: /^Roads look clear for the school commute\.$/i,
    hi: () => "स्कूल आवागमन के लिए सड़कें साफ़ दिख रही हैं।",
  },
  {
    re: /^Expect (.+) during commute hours — plan extra time\.$/i,
    hi: (_full, cond) => `आवागमन के समय ${cond} की संभावना है — अतिरिक्त समय रखें।`,
  },
  {
    re: /^High humidity \((.+?)\) with rain expected — monitor crops for fungal disease risk\.$/i,
    hi: (_full, hum) =>
      `उच्च नमी (${hum}) और बारिश की उम्मीद — फसलों में फफूंद रोग के जोखिम पर नज़र रखें।`,
  },
  {
    re: /^Rain expected soon — consider postponing irrigation\.$/i,
    hi: () => "जल्द बारिश की उम्मीद है — सिंचाई टालने पर विचार करें।",
  },
  {
    re: /^Humidity at (.+?), (.+) — monitor soil moisture before irrigating\.$/i,
    hi: (_full, hum, cond) =>
      `नमी ${hum}, ${cond} — सिंचाई से पहले मिट्टी की नमी जाँचें।`,
  },
  {
    re: /^Feels like (.+?) — comfortable for an outdoor event\.$/i,
    hi: (_full, feels) => `महसूस ${feels} — बाहरी कार्यक्रम के लिए आरामदायक।`,
  },
  {
    re: /^Feels like (.+?) — plan for extra shade\/heating and check the hourly forecast\.$/i,
    hi: (_full, feels) =>
      `महसूस ${feels} — अतिरिक्त छाया/गर्माहट की योजना बनाएँ और घंटेवार पूर्वानुमान देखें।`,
  },
  {
    re: /^UV index (.+?), humidity (.+?)\. Stay hydrated\.$/i,
    hi: (_full, uv, hum) => `UV सूचकांक ${uv}, नमी ${hum}। पानी पिएँ।`,
  },
  {
    re: /^UV index (.+?), humidity (.+?)\. Conditions are comfortable\.$/i,
    hi: (_full, uv, hum) => `UV सूचकांक ${uv}, नमी ${hum}। स्थितियाँ आरामदायक हैं।`,
  },
  {
    re: /^(.+?) today — consider limiting outdoor time for elderly family members and staying hydrated\/warm\.$/i,
    hi: (_full, temp) =>
      `आज ${temp} — वरिष्ठ परिवार सदस्यों का बाहर रहना सीमित रखें और हाइड्रेटेड/गर्म रहें।`,
  },
  {
    re: /^(.+?), (.+) — comfortable conditions today\.$/i,
    hi: (_full, temp, cond) => `आज ${temp}, ${cond} — स्थितियाँ आरामदायक हैं।`,
  },
  {
    re: /^Temperature has reached (.+?) in (.+)\. Avoid prolonged sun exposure and stay hydrated\.$/i,
    hi: (_full, temp, loc) =>
      `${loc} में तापमान ${temp} तक पहुँच गया है। लंबे समय तक धूप में न रहें और पानी पिएँ।`,
  },
  {
    re: /^It's (.+?) and feels like (.+?)\. Limit outdoor activity during midday hours\.$/i,
    hi: (_full, temp, feels) =>
      `तापमान ${temp} है और महसूस ${feels} हो रहा है। दोपहर में बाहर का काम सीमित रखें।`,
  },
  {
    re: /^Temperature has dropped to (.+?) in (.+)\. Dress warmly\.$/i,
    hi: (_full, temp, loc) => `${loc} में तापमान गिरकर ${temp} हो गया है। गर्म कपड़े पहनें।`,
  },
  {
    re: /^Wind speeds of (.+?) reported in (.+)\. Secure loose outdoor items\.$/i,
    hi: (_full, wind, loc) =>
      `${loc} में हवा की गति ${wind} दर्ज की गई है। बाहरी ढीली वस्तुएँ सुरक्षित करें।`,
  },
  {
    re: /^Thunderstorm activity detected in (.+)\. Avoid open areas and unnecessary travel\.$/i,
    hi: (_full, loc) =>
      `${loc} में आंधी-तूफान की गतिविधि दिख रही है। खुले स्थानों और अनावश्यक यात्रा से बचें।`,
  },
  {
    re: /^Reduced visibility due to fog in (.+)\. Drive carefully and use fog lights\.$/i,
    hi: (_full, loc) =>
      `${loc} में कोहरे के कारण दृश्यता कम है। सावधानी से गाड़ी चलाएँ और फॉग लाइट्स का उपयोग करें।`,
  },
  {
    re: /^UV index is (.+?) \(very high\) in (.+)\. Use sunscreen and seek shade\.$/i,
    hi: (_full, uv, loc) =>
      `${loc} में UV सूचकांक ${uv} (बहुत उच्च) है। सनस्क्रीन लगाएँ और छाया में रहें।`,
  },
  {
    re: /^AQI is (.+?) \((.+?)\) in (.+)\. Consider limiting outdoor exertion, especially for sensitive groups\.$/i,
    hi: (_full, aqi, cat, loc) =>
      `${loc} में AQI ${aqi} (${cat}) है। बाहर की मेहनत सीमित रखें, खासकर संवेदनशील लोगों के लिए।`,
  },
  {
    re: /^Official IMD district warning for (.+) \(Day (\d+)\)\. Codes: (.+)\. IMD colour code: (.+)\.$/i,
    hi: (_full, district, day, codes, color) =>
      `${district} के लिए आधिकारिक IMD ज़िला चेतावनी (दिन ${day})। कोड: ${codes}। IMD रंग कोड: ${color}।`,
  },
  {
    re: /^IMD district nowcast colour code (.+) for (.+)\.$/i,
    hi: (_full, color, station) => `${station} के लिए IMD ज़िला नाउकास्ट रंग कोड ${color}।`,
  },
  {
    re: /^Clear visibility expected\.$/i,
    hi: () => "दृश्यता साफ़ रहने की उम्मीद है।",
  },
  {
    re: /^Reduced visibility — allow extra travel time\.$/i,
    hi: () => "दृश्यता कम है — यात्रा के लिए अतिरिक्त समय रखें।",
  },
  {
    re: /^Wind at (.+?)\. Check the Marine card for wave and tide conditions\.$/i,
    hi: (_full, wind) => `हवा ${wind}। लहर और ज्वार के लिए समुद्री कार्ड देखें।`,
  },
];

const REASON_EXACT: Record<string, string> = {
  "Air quality crossed the unhealthy threshold for your selected interests":
    "आपकी चुनी रुचियों के लिए वायु गुणवत्ता अस्वस्थ सीमा पार कर गई है",
  "UV index is high and it's currently daytime": "UV सूचकांक ऊँचा है और अभी दिन का समय है",
  "You selected Outdoor Fitness and UV is currently low":
    "आपने आउटडोर फिटनेस चुना है और अभी UV कम है",
  "Current temperature is high": "वर्तमान तापमान ऊँचा है",
  "You selected Elderly/Vulnerable and today has a temperature extreme":
    "आपने वरिष्ठ/संवेदनशील चुना है और आज तापमान चरम पर है",
  "You selected Fisherman/Marine and winds are elevated":
    "आपने मछुआरा/समुद्री चुना है और हवा तेज़ है",
  "You selected Farmer/Agriculture and temperatures are near freezing":
    "आपने किसान/कृषि चुना है और तापमान जमाव के करीब है",
  "No unusual conditions detected right now": "अभी कोई असामान्य स्थिति नहीं दिख रही",
  "Based on today's temperature and UV curve": "आज के तापमान और UV वक्र के आधार पर",
  "Based on rain probability at your destination": "गंतव्य पर बारिश की संभावना के आधार पर",
  "Based on current road/visibility conditions": "वर्तमान सड़क/दृश्यता स्थितियों के आधार पर",
  "Based on humidity and rain forecast (weather-derived, not an official agronomic advisory)":
    "नमी और बारिश पूर्वानुमान के आधार पर (मौसम-आधारित, आधिकारिक कृषि सलाह नहीं)",
  "Based on current wind conditions": "वर्तमान हवा की स्थिति के आधार पर",
  "Based on current visibility": "वर्तमान दृश्यता के आधार पर",
  "Based on the 'feels like' comfort range": "‘महसूस’ आराम सीमा के आधार पर",
  "Based on current UV and temperature": "वर्तमान UV और तापमान के आधार पर",
  "Based on temperature extremes, which affect vulnerable groups most":
    "तापमान की चरम स्थितियों के आधार पर, जो संवेदनशील समूहों को सबसे अधिक प्रभावित करती हैं",
  "Weather-based recommendation": "मौसम-आधारित सुझाव",
  "Shown because your profile is Fitness and run timing depends on rain, UV, and heat.":
    "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल फिटनेस है और दौड़ का समय बारिश, UV और गर्मी पर निर्भर करता है",
  "Shown because your profile is Traveller and visibility/rain/wind may affect travel.":
    "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल यात्री है और दृश्यता/बारिश/हवा यात्रा को प्रभावित कर सकती है",
};

const REASON_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^(\d+)% rain chance this evening$/i, (m) => `आज शाम बारिश की संभावना ${m[1]}%`],
  [
    /^Shown because your profile is Farmer, your crop is (.+) at (.+) stage, and rainfall is relevant to irrigation planning\.$/i,
    (m) =>
      `यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल किसान है, फसल ${m[1]} है (${m[2]} अवस्था), और सिंचाई योजना के लिए वर्षा प्रासंगिक है`,
  ],
  [
    /^Shown because your profile is Farmer(.*)$/i,
    (m) => `यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल किसान है${m[1] || ""}`,
  ],
  [
    /^Shown because your profile is Fitness(.*)$/i,
    (m) => `यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल फिटनेस है${m[1] || ""}`,
  ],
  [
    /^Shown because your profile is Traveller(.*)$/i,
    (m) => `यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल यात्री है${m[1] || ""}`,
  ],
];

function localizeHazardFragment(text: string): string {
  let out = text;
  for (const [re, hi] of HAZARD_PHRASES) {
    out = out.replace(re, hi);
  }
  return out;
}

export function localizeAlertTitle(title: string, locale: string): string {
  if (!title || locale !== "hi") return title;

  const exact = TITLE_EXACT[title.trim()];
  if (exact) return exact;

  const imdDay = title.match(/^IMD Day (\d+):\s*(.+)$/i);
  if (imdDay) {
    return `IMD दिन ${imdDay[1]}: ${localizeHazardFragment(imdDay[2])}`;
  }

  const imdNowcast = title.match(/^IMD Nowcast:\s*(.+)$/i);
  if (imdNowcast) {
    return `IMD नाउकास्ट: ${localizeHazardFragment(imdNowcast[1])}`;
  }

  const aqi = title.match(/^Air Quality Alert:\s*(.+)$/i);
  if (aqi) {
    return `वायु गुणवत्ता चेतावनी: ${aqi[1]}`;
  }

  return localizeHazardFragment(title);
}

export function localizeAlertDescription(description: string, locale: string): string {
  if (!description || locale !== "hi") return description;
  const trimmed = description.trim();

  for (const rule of DESCRIPTION_RULES) {
    const m = trimmed.match(rule.re);
    if (m) return rule.hi(...m);
  }

  // Soft phrase pass for mixed/unknown IMD nowcast messages — keep numbers/names.
  let out = trimmed;
  out = out.replace(/^Official IMD district warning for /i, "आधिकारिक IMD ज़िला चेतावनी: ");
  out = out.replace(/\(Day (\d+)\)/gi, "(दिन $1)");
  out = out.replace(/\bCodes:\s*/gi, "कोड: ");
  out = out.replace(/\bIMD colour code:\s*/gi, "IMD रंग कोड: ");
  out = out.replace(/\bValid up to\b/gi, "मान्य तक");
  out = localizeHazardFragment(out);
  return out;
}

export function localizeWhyReason(reason: string, locale: string): string {
  if (!reason || locale !== "hi") return reason;
  const exact = REASON_EXACT[reason.trim()];
  if (exact) return exact;
  for (const [re, build] of REASON_PATTERNS) {
    const m = reason.trim().match(re);
    if (m) return build(m);
  }
  return reason;
}

export function localizeWhyLabel(label: string | undefined, locale: string): string | undefined {
  if (!label || locale !== "hi") return label;
  return REASON_EXACT[label.trim()] ?? localizeHazardFragment(label);
}

/** Insight / advisory message lines share the same presentation templates as alert descriptions. */
export function localizeInsightMessage(message: string, locale: string): string {
  return localizeAlertDescription(message, locale);
}
