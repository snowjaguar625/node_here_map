/* 
* author domschuette
* (C) HERE 2014
*/

/*! ENSURE MOMENT.JS and moment-range.js is loaded in the main script, otherwise use this in the c'tor
	var script = document.createElement('script');
	script.src = 'http://cdnjs.cloudflare.com/ajax/libs/moment.js/2.8.2/locales.js';
	document.head.appendChild(script);
*/

function DateTimeParser(dateTimeStrings, date)
{
	this.dateTimeStrings = dateTimeStrings.split(",");
	this.date = date;
	this.parsed = this.parse();
}

DateTimeParser.prototype.parse = function()
{
	/*
	Comma seperated list of Date/Time modifiers to indicate specific time periods when the conditional speedlimit applies.
	One entry contains following colon seperated values:
	DATETIME_TYPE: High level indication of the period for which the date time restriction is valid. The value of this type effects the interpretation of START_DATE/END_DATE
	C - Day of Month, Example: 00010000 - f.e. 1 January, 1 February,..., 1 December
	D - Day of Week of Month, Example: 00010002 - 2nd Sunday of each month, 00020001 - 1st Monday of each month, 00070002 - 2nd Saturday of each month, 00060005 - 5th Friday of each month
	E - Day of Week of Year, Example: 00030020 - Tuesday of week 20, 00050052 - Thursday of week 52
	F - Week of Month, Example: 00020000 - 2nd week of each month
	H - Month of Year, Example: 00010000 - January, 00070000 - July
	I - Day of Month of Year, Example: 00150001 - 15 January of each year, 00300004 - 30 April of each year
	1 - Day of week starting with Sunday, Example: X XX - Sunday and Friday and Saturday, XXXXXXX - all weekdays
	2 - External date, Example: Easter
	A - Date Ranges, Example: 20131119 - 19th of november year 2013
	For Date Time Type = A-I, the Start Date represents the start of the range and the End Date represents the end of the range.
	For Date Time Type = 1, Start Date identifies the day(s) of the week. End Date is not published for Date Time Type = 1.
	For Date Time Type = 2, Start Date identifies the name of the external date. The only currently existing situation is ?Easter?. End Date is not published for Date Time Type = 2.
	FROM_END: This attribute allows time to be specified 'from the end' of a standard time period such as month and year
	EXCLUDE_DATE: Flag that indicates if the specified data (in Date Time Type) represents an excluded date. Example, all year except 30 April is modelled Exclude Date = Y, with Start Date = 30 April.
	START_DATE: Identifies the start dates of the Date/Time for Date Time Type = A-I. Identifies the days of the week for Date Time Type = 1 and the external date for Date Time Type = 2.
	END_DATE: Identifies the end date of the Date/Time for Date Time Types = A-I.
	START_TIME: Identifies the start time for the time period in which the Date Time restriction is in effect. Time in format HHMM, where a 24 hour clock is used. Range 0000...2400. Example: 1130 means 11:30 and 2115 means 21:15
	END_TIME: Identifies the end time for the time period in which the Date Time restriction is in effect. Time in format HHMM, where a 24 hour clock is used. Range 0000...2400. Example: 1130 means 11:30 and 2115 means 21:15
	
	Examples:
				"1:N:N:XXXXXXX ::700:1900"  --> Daymask, each day in a week from 07:00 till 19:00
				"2:N:N:EASTER:01512131:800:1800" --> Easter, by specification there is no end date, so ignore 015121131
				"C:N:N:00010000:00050000:1230:1330" --> each first to fifth day in all month from 12:30 to 13:30 (DDDD0000 where DDDD is in Range 0001 - 0031)
				"D:N:N:00070001:00070001:1000:1600" --> each first Saturday in all month from 10:00 to 16:00  (DDDDWWWW where DDDD is in Range 0001 - 0007 and WWWW is in Range 0001 - 0005)
				"E:N:N:00010015:00010015:800:1800" --> Sunday in week no 15 (DDDDWWWW where DDDD is in Range 0001 - 0007 and WWWW is in Range 0001 - 0052)
				"F:N:N:00030000:00040000:800:1730" --> from the 3rd to the 4st week from 8:00 to 17:30 each month (WWWW0000 where www is in Range 0001 - 0005)
				"I:N:N:00010010:00110010:1730:2400" --> from October 1st to Ocotober 11 each day from 17:30 to 24:00
	*/

	var i = 0,
		l = this.dateTimeStrings.length,
		r = new Array();

	for(;i < l; i++)
	{
		var dateTimeString = this.dateTimeStrings[i].split(":"),
			dateTimeType = dateTimeString[0], 
			
			// fromEnd and Exclude date are valid for all date times 
			fromEnd = dateTimeString[1] === 'N' ? false : true,
			excludeDate = dateTimeString[2] === 'N' ? false : true,
			start_date,
			end_date,
			start_time = this.parseTime(dateTimeString[5]),
			end_time = this.parseTime(dateTimeString[6]);
			
		switch (dateTimeType)
		{
			case "1" : 	{
							start_date = this.daymask(dateTimeString[3]); 
							end_date = null; 
						}
						break;
			case "2" : 
						{
							start_date = dateTimeString[3]; 
							end_date = null; 
						}
						break;
			case "C" : 	
						{
							start_date = this.parseDayOfMonth(dateTimeString[3]);
							end_date = this.parseDayOfMonth(dateTimeString[4]);
						}
						break;
			case "D" :
						{
							start_date = this.parseDayOfWeekOfMonth(dateTimeString[3]);
							end_date = this.parseDayOfWeekOfMonth(dateTimeString[4]);
						}
						break;
			case "E" : 
						{
							start_date = this.parseDayOfWeekOfYear(dateTimeString[3]);
							end_date = this.parseDayOfWeekOfYear(dateTimeString[4]);
						}
						break;
			case "F" : 
						{
							start_date = dateTimeString[3][2] + dateTimeString[3][3];
							end_date = dateTimeString[4][2] + dateTimeString[4][3];
						}
						break;
			case "H" : 
						{
							start_date = this.parseMonthOfYear(dateTimeString[3]);
							end_date = this.parseMonthOfYear(dateTimeString[4]);
						}
			case "I" :
						{
							start_date = this.parseDayOfMonthOfYear(dateTimeString[3]);
							end_date = this.parseDayOfMonthOfYear(dateTimeString[4]);
						}
						break;
			case "A" :
						{
							console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
							console.log(dateTimeString[3])
							console.log(dateTimeString[4])
							start_date = moment(dateTimeString[3]);
							end_date = moment(dateTimeString[4]);
						}
						break;
		}
		
		r.push({ dateTimeType: dateTimeType, fromEnd: fromEnd, excludeDate: excludeDate, start_date: start_date, end_date: end_date, start_time : start_time, end_time: end_time});
	}
	
	return r;
}

DateTimeParser.prototype.daymask = function(mask)
{
	var sun,
		mon,
		tue,
		wed,
		thu,
		fri,
		sa,
		l = mask.length,
		i = 0;
	
	for(; i < l -1; i++)	// l -1 because the week has only 7 days
	{
		switch(i)
		{
			case 0: mask[i] === "X" ? sun = true : sun = false; break;
			case 1: mask[i] === "X" ? mon = true : mon = false; break;
			case 2: mask[i] === "X" ? tue = true : tue = false; break;
			case 3: mask[i] === "X" ? wed = true : wed = false; break;
			case 4: mask[i] === "X" ? thu = true : thu = false; break;
			case 5: mask[i] === "X" ? fri = true : fri = false; break;
			case 6: mask[i] === "X" ? sat = true : sat = false; break;
		}
	}
	
	return { Sun: sun, Mon : mon, Tue : tue, Wed : wed, Thu : thu, Fri : fri, Sat : sat };
}

DateTimeParser.prototype.parseTime = function(time)
{
	while(time.length < 4)
	{
		time = "0" + time;
	}
	
	return { hour: time[0] + time[1], min: time[2] + time[3]};
}

DateTimeParser.prototype.parseDayOfMonth = function(dayOfMonth)
{
	return dayOfMonth[2] + dayOfMonth[3];
}

DateTimeParser.prototype.parseWeekDay = function(weekDay)
{
	var day;
	
	switch(weekDay)
	{
		case "1": day = "Sun";break;
		case "2": day = "Mon";break;
		case "3": day = "Tue";break;
		case "4": day = "Wed";break;
		case "5": day = "Thu";break;
		case "6": day = "Fri";break;
		case "7": day = "Sat";break;
	}
	return day;
}

DateTimeParser.prototype.parseMonthName = function(no)
{
	var month; 
	switch(no)
	{
		case "0001" : month = "Jan"; break;
		case "0002" : month = "Feb"; break;
		case "0003" : month = "Mar"; break;
		case "0004" : month = "Apr"; break;
		case "0005" : month = "May"; break;
		case "0006" : month = "Jun"; break;
		case "0007" : month = "Jul"; break;
		case "0008" : month = "Aug"; break;
		case "0009" : month = "Sep"; break;
		case "0010" : month = "Oct"; break;
		case "0011" : month = "Nov"; break;
		case "0012" : month = "Dec"; break;
	}
	return month;
}

DateTimeParser.prototype.parseDayOfWeekOfMonth = function(dayOfWeekOfMonth)
{
	return { day: this.parseWeekDay(dayOfWeekOfMonth[3]), no: dayOfWeekOfMonth[7] };
}

DateTimeParser.prototype.parseDayOfWeekOfYear = function(dayOfWeekOfYear)
{
	return { day: this.parseWeekDay(dayOfWeekOfYear[3]), weekNo: dayOfWeekOfYear[7] };
}

DateTimeParser.prototype.parseMonthOfYear = function(monthOfYear)
{
	return { month: this.parseMonthName(monthOfYear) };
}

DateTimeParser.prototype.parseDayOfMonthOfYear = function(dayOfMonthOfYear)
{
	return { day: dayOfMonthOfYear[2] + dayOfMonthOfYear[3], month: this.parseMonthName(dayOfMonthOfYear[4] + dayOfMonthOfYear[5] + dayOfMonthOfYear[6] + dayOfMonthOfYear[7]) };
}

DateTimeParser.prototype.getDayOfWeek = function(dayNumber)
{
	var value; 
	switch(dayNumber)
	{
		case 1 : value = "Mon"; break;
		case 2 : value = "Tue"; break;
		case 3 : value = "Wed"; break;
		case 4 : value = "Thu"; break;
		case 5 : value = "Fri"; break;
		case 6 : value = "Sat"; break;
		case 7 : value = "Sun"; break;
	}
	return value;
}

DateTimeParser.prototype.getDayNoOfWeek = function(day)
{
	var value; 
	switch(day)
	{
		case "Mon" : value = 1; break;
		case "Tue" : value = 2; break;
		case "Wed" : value = 3; break;
		case "Thu" : value = 4; break;
		case "Fri" : value = 5; break;
		case "Sat" : value = 6; break;
		case "Sun" : value = 7; break;
	}
	return value;
}

DateTimeParser.prototype.easter = function()
{
	// based on the Script from Ralf Pfeifer (www.arstechnica.de)
	var year = this.date.year();
	
	if ((year < 1970) || (2099 < year)) 
	{  
		throw("invalid year"); 
	}

    var a = year % 19,
		d = (19 * a + 24) % 30,
        day = d + (2 * (year % 4) + 4 * (year % 7) + 6 * d + 5) % 7;
    
	if ((day == 35) || ((day == 34) && (d == 28) && (a > 10))) { day -= 7; }

	var easterDate = new Date(year, 2, 22);
	easterDate.setTime(easterDate.getTime() + 86400000 * day);

	return moment(easterDate); 
}

DateTimeParser.prototype.getDateForWeekDay = function(day, occurrence, month, year)
{
    var now = moment(),
		j = 0;
	
	day = this.getDayNoOfWeek(day);
	
	now.year(year);
	now.month(month);
	now.date(1);	
		
    if (day - now.weekday() >= 0)
        j = day - now.weekday() + 1;
    else
        j = 7 - now.weekday() + day + 1;
 
    return j + (occurrence - 1) * 7;
}

DateTimeParser.prototype.check = function()
{
	// { dateTimeType: dateTimeType, fromEnd: fromEnd, excludeDate: excludeDate, start_date: start_date, end_date: end_date, start_time : start_time, end_time: end_time});
	
	var checkDate = this.date,
		dateTimeObj = this.parsed,
		l = dateTimeObj.length,
		i = 0,
		currentObject, 
		ret = false;
	for(;i < l; i++)
	{
		currentObject = dateTimeObj[i];
		switch(currentObject.dateTimeType)
		{
			// day range
			case "1": 
					{
						// first get the weekday
						var days = currentObject.start_date,
							day = this.getDayOfWeek(checkDate.weekday()),
							dayAffected = false;
						
						// check if the day is affected
						for(var cd in days)
						{
							if(cd === day && days[cd])
							{
								dayAffected = true;
								break;
							}
						}
						
						// check the range if a day is effected
						if(dayAffected)
						{
							var start = moment(), 
								end = moment();
							
							start.year(checkDate.year());
							start.month(checkDate.month());
							start.date(checkDate.date());
							start.hour(currentObject.start_time.hour);
							start.minute(currentObject.start_time.min);
							start.seconds(0);
							
							end.year(checkDate.year());
							end.month(checkDate.month());
							end.date(checkDate.date());
							end.hour(currentObject.end_time.hour);
							end.minute(currentObject.end_time.min);
							end.seconds(0);
							
							var range = moment().range(start, end);
							
							if(range.contains(checkDate))
								ret = true;
						}
					}
					break;
			// easter
			case "2": 
					{
						var easter = easter(),
							start = moment(),
							end = moment();
							
						start.year(easter.year());
						start.month(easter.month());
						start.date(easter.date());
						start.hour(currentObject.start_time.hour);
						start.minute(currentObject.start_time.min);
						start.seconds(0);
							
						end.year(easter.year());
						end.month(easter.month());
						end.date(easter.date());
						end.hour(currentObject.end_time.hour);
						end.minute(currentObject.end_time.min);
						end.seconds(0);
							
						var range = moment().range(start, end);
							
						if(range.contains(checkDate))
							ret = true;	
					}
					break;
			
			case "C":
					{
						var date = checkDate.date(),
							start = parseInt(currentObject.start_date),
							end = parseInt(currentObject.end_date);
						if(date >= start && date <= end)
						{
							start = checkDate;
							end = checkDate;
							
							start.hour(currentObject.start_time.hour);
							start.minute(currentObject.start_time.min);
							
							end.hour(currentObject.end_time.hour);
							end.minute(currentObject.end_time.min);
							
							var range = moment().range(start, end);
							
							if(range.contains(checkDate))
								ret = true;	
						}
					}
					break;
			case "D":
					{
						if(currentObject.start_date.day == this.getDayOfWeek(checkDate.weekday()))
						{
							
							var startDayNo = this.getDateForWeekDay(currentObject.start_date.day, parseInt(currentObject.start_date.no), checkDate.month(), checkDate.year()),
								endDayNo = this.getDateForWeekDay(currentObject.end_date.day, parseInt(currentObject.end_date.no), checkDate.month(), checkDate.year()),							
								start = checkDate,
								end = checkDate;
							
							start.date(startDayNo);
							start.hour(currentObject.start_time.hour);
							start.minute(currentObject.start_time.min);
							
							end.date(endDayNo);
							end.hour(currentObject.end_time.hour);
							end.minute(currentObject.end_time.min);
							
							var range = moment().range(start, end);
							
							if(range.contains(checkDate))
								ret = true;	
						}
					}
					break;
			case "E":
					{
						if(currentObject.start_date.day == this.getDayOfWeek(checkDate.weekday()))
						{
							if(checkDate.week() == currentObject.start_date.weekNo)
							{
								var start = checkDate,
									end = checkDate,
									sDay = this.getDayNoOfWeek(currentObject.start_date.day),
									eDay = this.getDayNoOfWeek(currentObject.end_date.day);
									
								start.week(currentObject.start_date.weekNo);
								start.date(sDay);
								start.hour(currentObject.start_time.hour);
								start.minute(currentObject.start_time.min);
								
								end.week(currentObject.end_date.weekNo);
								end.date(eDay);
								end.hour(currentObject.end_time.hour);
								end.minute(currentObject.end_time.min);
								
								var range = moment().range(start, end);
							
								if(range.contains(checkDate))
									ret = true;	
							}
						}
					}
					break;
			case "F":
					{
						var start = checkDate, 
							end = checkDate,
							range;
							
						start.week(parseInt(currentObject.start_date));
						start.hour(currentObject.start_time.hour);
						start.minute(currentObject.start_time.min);
						
						end.week(parseInt(currentObject.end_date));
						end.hour(currentObject.end_time.hour);
						end.minute(currentObject.end_time.min);

						var range = moment().range(start, end);
							
						if(range.contains(checkDate))
							ret = true;	
					}
					break;
			case "I":
					{
						var start = checkDate,
							end = checkDate,
							startday = parseInt(currentObject.start_date.day),
							endday = parseInt(currentObject.end_date.day),
							i = startday;
							
						for(;i <= endday; i++)
						{
							start.month(currentObject.start_date.month);
							start.date(startDayNo);
							start.hour(currentObject.start_time.hour);
							start.minute(currentObject.start_time.min);
							
							end.month(currentObject.end_date.month);
							end.date(endDayNo);
							end.hour(currentObject.end_time.hour);
							end.minute(currentObject.end_time.min);
							
							var range = moment().range(start, end);
							if(range.contains(checkDate))
							{
								ret = true;	
								break;
							}
						}
					}
					break;
			case "A":
					{
						var
							start = currentObject.start_date,
							end = currentObject.end_date;
						start.hour(currentObject.start_time.hour);
						start.minute(currentObject.start_time.min);
						end.hour(currentObject.end_time.hour);
						end.minute(currentObject.end_time.min);
						var range = moment().range(start, end);
						if(range.contains(checkDate))
						{
							ret = true;
						}else{
						}
						break;
					}
			default: throw("Invalid dateTimeType");
		}
	}
	return ret;
}