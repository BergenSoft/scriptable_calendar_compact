// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: calendar-alt;
/* ---------------------------------------------------*/
/*              COMPACT CALENDAR WIDGET               */
/*              Show next running events              */
/*            Widget created by BergenSoft            */
/* -------------------------------------------------- */

/*****************
Version 1.0.1

Changelog:
----------

Version 1.0.1:
    Fixed displaying of the age from birthday events.

If you have problems or need help, please ask for support here:
https://github.com/BergenSoft/scriptable_calendar_compact

*/


//  WIDGET SETTINGS
// Widget behaviour
const testMode = false  // Change to true to see a preview of your widget and for the first start to get calendar access.
const calendarsNames = ["Calendar 1", "Calendar 2"]; // set to null or [] to use all events
const birthdayCalendarName = "Geburtstage";
const switchBirthdayNames = false; // Switch to true if you want to swap first and last name abbreviation
const showBirthdays = true;        // set to false if you don't want to see birthdays
const maxCountLines = 9;           // max lines to show in widget.
const showAlwaysTodayDate = true;  // show always today date, even there are no birthdays or events
const maxDaysLookup = 14;          // look for the next x days for events

const runScriptUrl = "weekcal://"; // change to calshow:// to use default calendar, use weekcal:// for weekcal calendar


// Widget Style Setup - edit this section to customise your calendar
const backgroundColor = "#1C1C1D"; // widget background color
const todayColor = "#EB5545";      // current date
const dateColor = "#DDDDDD";       // dates of events and no-events message
const birthdayColor = "#505050";   // backgroud color of the birthday fields.
const textColor = "#FFFFFF";       // events titles
const timeColor = "#D8D8D8";       // time of events

const widgetPadding = [4, 4, 4, 4,];
const eventFontSize = 12  // font size for events
const dateFontSize = 10   // font size for events date
const opacity = 0.6;      // Used for

// Translations
const eventFree = "Keine Termine"  // message to show if there aren't events
const allDayEvent = "Ganztägig"    // what to show when an event is all-day

// Store other global values.
const todayDate = new Date();
let lastDate = null;
let widget = new ListWidget();
const dateFormatterDay = new DateFormatter();
dateFormatterDay.dateFormat = "EE dd.MM.yyyy"; // shows day


// If we're in the widget or testing, build the widget.
if (config.runsInWidget || testMode)
{
    if (testMode)
    {
        // Make sure we have calendar access.
        await CalendarEvent.today([])
    }

    // Create Widget
    let widget = await createWidget();
    Script.setWidget(widget);
    Script.complete();
    await widget.presentLarge();

    async function createWidget()
    {
        let widget = new ListWidget();
        widget.backgroundColor = new Color(backgroundColor);
        widget.setPadding(...widgetPadding);
        const globalStack = widget.addStack();
        globalStack.layoutVertically();

        // Go through all events
        let targetLines = 0;        // countTargetLines
        let dateStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()); // date to check from
        let dateEnd = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1);   // date to check to

        for (let i = 0; i < maxDaysLookup; i++)
        {
            const isToday = dateFormatterDay.string(todayDate) == dateFormatterDay.string(dateStart);
            const events = await CalendarEvent.between(dateStart, dateEnd, []);
            let filteredEvents = [];
            let filteredBirthdays = [];

            for (const event of events)
            {
                // filter out canceled events and already pasts events
                if (event.endDate.getTime() < todayDate.getTime() || event.title.startsWith("Canceled:"))
                    continue;


                // collect brithdays is wanted
                if (showBirthdays && event.calendar.title == birthdayCalendarName)
                    filteredBirthdays.push(event);

                // collect other events that match requested calendars.
                if (event.calendar.title != birthdayCalendarName && (calendarsNames == null || calendarsNames.length == 0 || calendarsNames.indexOf(event.calendar.title) != -1))
                    filteredEvents.push(event);
            }

            // add date and events and count added lines
            if ((showAlwaysTodayDate && isToday) || filteredBirthdays.length > 0 || filteredEvents.length > 0)
                targetLines += addDay(globalStack, dateStart, filteredBirthdays, filteredEvents, maxCountLines - targetLines, isToday);

            // Already got enough events
            if (targetLines >= maxCountLines)
                break;

            // go one day forward
            dateStart.setDate(dateStart.getDate() + 1);
            dateEnd.setDate(dateEnd.getDate() + 1);
        }

        // No events was found
        if (targetLines == 0)
        {
            addWidgetTextLine(globalStack, eventFree, {
                color: dateColor,
                font: Font.regularSystemFont(eventFontSize),
                align: "left",
            });
        }

        return widget;
    }

    /* Format the time of the events into just hours (h:mm a) */
    function formatTime(todayDate)
    {
        let dateFormatter = new DateFormatter();
        dateFormatter.useNoDateStyle();
        dateFormatter.useShortTimeStyle();
        return dateFormatter.string(todayDate);
    }

    /* Format the time of the events into just todayDate (d-MMM) */
    function showTheDate(theDate)
    {
        let showEnddate = new DateFormatter();
        showEnddate.useMediumDateStyle();
        showEnddate.useNoTimeStyle();
        return showEnddate.string(theDate);
    }

    /* Add a day with all birthdays and events until the maxLines are reached */
    function addDay(stack, eventsDate, birthdays, events, maxLines, today)
    {
        let lines = 0;
        if (maxLines == 0)
            return lines;

        // just one line left, so there is no space for the events
        if (maxLines == 1 && birthdays.length == 0)
            return 1; // stop adding more events

        // Add a date line
        const dateStack = stack.addStack();
        //         dateStack.addSpacer(4); // Space between date and birthdays
        addWidgetTextLine(dateStack, dateFormatterDay.string(eventsDate), {
            color: today ? todayColor : dateColor,
            font: Font.boldSystemFont(eventFontSize),
        });

        // add birthdays
        for (const event of birthdays)
        {
            dateStack.addSpacer(3); // Space between birthdays
            const birthdayStack = dateStack.addStack();
            addWidgetTextLine(birthdayStack, '🎁' + getBirthdayTitle(event.title), {
                color: textColor,
                font: Font.mediumSystemFont(eventFontSize),
                lineLimit: 1
            });

            birthdayStack.backgroundColor = new Color(birthdayColor);
            birthdayStack.cornerRadius = eventFontSize / 2;
        }

        // count date line
        lines++;
        if (maxLines - lines == 0)
            return lines;


        for (const event of events)
        {
            const eventStack = stack.addStack();
            eventStack.layoutHorizontally();

            // Create line with time (or todayDate) of the event
            let timeStack = eventStack.addStack();
            timeStack.addSpacer(4);
            timeStack.centerAlignContent();
            timeStack.size = new Size(80, eventFontSize + 3);
            const start = `${formatTime(event.startDate)}`;     //starting time
            const end = `${formatTime(event.endDate)}`;         //ending time
            const firstDay = `${showTheDate(event.startDate)}`; //starting todayDate
            const lastDay = `${showTheDate(event.endDate)}`;    //ending todayDate

            //if times are different but on the same day show start time end end time
            if (start != end && firstDay == lastDay && !event.isAllDay)
            {
                const time = `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`;
                addWidgetTextLine(timeStack, time, {
                    color: timeColor,
                    opacity,
                    font: Font.mediumSystemFont(dateFontSize),
                });

            }
            //if event begins and ends on different days show the todayDate (d-MMM) - .replace removes the year
            else if (firstDay != lastDay && start != end)
            {
                const time = `${showTheDate(event.startDate).replace(/\w+[.!?]?$/, '-')} ${showTheDate(event.endDate).replace(/\w+[.!?]?$/, '')}`;
                addWidgetTextLine(timeStack, time, {
                    color: timeColor,
                    opacity,
                    font: Font.mediumSystemFont(dateFontSize),
                });

            }
            else if (start == end && firstDay == lastDay)
            {
                const time = `${formatTime(event.startDate)}`;
                addWidgetTextLine(timeStack, time, {
                    color: timeColor,
                    opacity,
                    font: Font.mediumSystemFont(dateFontSize),
                });
            }
            //if the event is all day, show message
            else if (event.isAllDay)
            {
                const time = allDayEvent;
                addWidgetTextLine(timeStack, time, {
                    color: timeColor,
                    opacity,
                    font: Font.mediumSystemFont(dateFontSize),
                });
            }

            timeStack.addSpacer();

            // Show calendar color indicator
            let colorStack = eventStack.addStack();
            colorStack.size = new Size(4, eventFontSize + 3);
            colorStack.cornerRadius = 2;
            colorStack.backgroundColor = event.calendar.color;

            eventStack.addSpacer(3);

            let titleStack = eventStack.addStack();
            titleStack.size = new Size(220, eventFontSize + 3);
            // Create line with event title
            addWidgetTextLine(titleStack, event.title, {
                color: textColor,
                font: Font.mediumSystemFont(eventFontSize),
                lineLimit: 1
            });
            titleStack.addSpacer(); // left align text

            // Count added lines
            lines++;
            stack.addSpacer(2);
            if (maxLines - lines == 0)
                return lines;
        }

        stack.addSpacer(2);
        return lines;
    }


    // shortend birthday title
    function getBirthdayTitle(title)
    {
        if (switchBirthdayNames)
        {
            const regexp = /([^ ,.]*)[^ ,.]* ([A-Za-z])[^\(]*\(([0-9]+)?/;
            const groups = title.match(regexp);

            if (groups[3] == null)
                return groups[1] + ' ' + groups[2] + '.';
            return groups[1] + ' ' + groups[2] + '. (' + groups[3] + ')';
        }
        else    
        {
            const regexp = /([A-Za-z])[^ ,.]* ([^ ,.]*)[^\(]*\(([0-9]+)?/;
            const groups = title.match(regexp);

            if (groups[3] == null)
                return groups[2] + ' ' + groups[1] + '.';
            return groups[2] + ' ' + groups[1] + '. (' + groups[3] + ')';
        }
    }



    /* Help function to add text */
    function addWidgetTextLine(
        widget,
        text,
        {
            color,
            textSize,
            opacity = 1,
            font = "",
            lineLimit = 0,
        }
    )
    {
        let textLine = widget.addText(text);
        textLine.lineLimit = lineLimit;
        textLine.textColor = new Color(color);
        if (typeof font === "string")
        {
            textLine.font = new Font(font, textSize);
        }
        else
        {
            textLine.font = font;
        }
        textLine.textOpacity = opacity;
        return textLine;
    }
}
else if (!config.runsInWidget)
{
    const callback = new CallbackURL(runScriptUrl);
    callback.open();
    Script.complete();
}
