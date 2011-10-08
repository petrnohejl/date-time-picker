/*
Date & Time picker
Petr Nohejl
3.5.2010
	
TODO:
vyresit problem s onclick - blokovani
nacitat konfiguraci z textoveho pole do popup
pri zmene velikosti okna zmizet popup popr refresh
polymorfni parametry funkci, pridat ruzny fce a vychytavky (zobraz cislo tydne v kalendari)
validace retezce v poli
refresh kalendare - ne pri zobrazeni popup!
rozdil mezi onclick a "a href="javascript:"
TUNING: doplnovani dnu i mimo mesic, vypis cisla tydne, prvni den v tydnu - pondeli/nedele
.active u kalendare
zvyraznit today
title popisky do vyberovych prvku, napr. today, 3.5.2010
pri kliknuti na tlacitko if popup je zobrazen, skryt popup
otestovani ve vsech prohl.
strukturovany kalendar - viz win7
	
FORMAT:
y ... rok jako dvojčíslí (00)
Y ... rok jako čtyřčíslí (2000)
L ... 0 (nepřestupný rok) nebo 1 (přestupný rok)
z ... číslo dne v roce (001-365)
m ... číslo měsíce (01-12)
n ... číslo měsíce (bez případné úvodní nuly, 1-12)
M ... anglická zkratka názvu měsíce (Jul)
F ... anglický název měsíce (July)
d ... číslo dne v měsíci (01-31)
j ... číslo dne v měsíci (bez případné úvodní nuly, 1-31)
t ... počet dní v daném měsíci (28-31)
S ... anglická koncovka čísla dne v měsíci (st, nd, rd, th)
D ... anglická zkratka názvu dne v týdnu (Mon)
l ... anglický název dne v týdnu (Monday)
w ... číslo dne v týdnu (0-6 nebo 1-7 v závislosti na verzi PHP - neděle má číslo 0 nebo 7)

h ... hodiny (01-12)
g ... hodiny (bez případné úvodní nuly, 1-12)
H ... hodiny (01-23)
G ... hodiny (bez případné úvodní nuly, 1-23)
a ... am/pm (dopoledne/odpoledne)
A ... AM/PM (dopoledne/odpoledne)
i ... minuty (00-59)
s ... sekundy (00-59)
U ... počet sekund od 1. ledna 1970
*/



/*********************************************************************************************************************/
/* GLOBALNI PROMENNE                                                                                                 */
/*********************************************************************************************************************/

// nazvy dnu v tydnu
var PICKER_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var PICKER_DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// priznaky dopoledne/odpoledne
var PICKER_DAY_AMPM = ['am', 'pm'];
// koncovky cisla dne v mesici
var PICKER_DATE_SUFFIX = ['st', 'nd', 'rd', 'th'];
// nazvy mesicu
var PICKER_MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
var PICKER_MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// pocty dni v mesici
var PICKER_MONTH_SIZES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// preddefinovane casy
var PICKER_TIME = ['Now','Midnight','3 Night','6 Morning','9 Morning','Noon','3 Afternoon','6 Evening','9 Evening'];
var PICKER_TIME_VALUES = [24, 0, 3, 6, 9, 12, 15, 18, 21];
// navigacni tlacitka kalendare
var PICKER_NAVIGATION = ['&laquo;', '&lsaquo;', '&rsaquo;', '&raquo;'];
var PICKER_NAVIGATION_TITLE = ['Previous year', 'Previous month', 'Next month', 'Next year', 'Actual month'];
// formatovaci znaky
var PICKER_FORMAT = "yYLzmnMFdjtSDlwhgHGaAisU";



/*********************************************************************************************************************/
/* POMOCNE FUNKCE                                                                                                    */
/*********************************************************************************************************************/

// je prvek nadrazeny?
function pickerIsParent(t, e)
{
	while(t.parentNode)
	{
		if(t == e) return false;
		t = t.parentNode;
	}
	return true;
}

// nahradi v retezci dany podretezec za jiny podretezec a vrati vysledny retezec
function pickerReplaceString(str, oldstr, newstr, from)
{
	var position = str.indexOf(oldstr, from);
	var prefix = str.substr(0, position);
	var suffix = str.substr(position + oldstr.length);
	return prefix + newstr + suffix;
}

// doplnuje nuly na urcity pocet cifer
function pickerNumCharsString(num, size)
{
	var str = num.toString();
	while(str.length<size) str = "0" + str;
	return str;
}

// vrati absolutni pozici HTML elementu v poli [zleva, shora]
function pickerFindPos(obj)
{
	var curleft = curtop = 0;
	if (obj.offsetParent) 
	{
		do
		{
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
	}
	return [curleft, curtop];
}

// zajistuje zobrazovani/schovavani popup okenka
function pickerShowPopup(id, layout)
{
	var button = document.getElementById(id+'-button');
	var popup = document.getElementById(id+'-popup');

	// obsah okenka
	popup.innerHTML = layout;
	
	// pozice tlacitka
	var position = pickerFindPos(document.getElementById(id+'-button'));
	var disX = document.getElementById(id+'-button').offsetWidth;
	popup.setAttribute('style', 'display:none;z-index:1000;left:' + (position[0] + disX) + 'px;top:' + position[1] + 'px');

	// zobrazovani/schovavani popup okenka
	document.onclick = function(e)
	{
		var target = (e && e.target) || (event && event.srcElement);
		pickerIsParent(target, popup) ? popup.style.display='none' : null;
		target==button ? popup.style.display='block' : null;
	}
}



/*********************************************************************************************************************/
/* PARSE                                                                                                             */
/*********************************************************************************************************************/

function pickerParse(format, date)
{
	var pos;				// pozice retezce
	var tmp;				// pomocna promenna
	var tmp2;				// pomocna promenna
	var parse = true;		// cyklicky parsovat formatovaci retezec?
	
	var year = date.getFullYear();
	var month = date.getMonth();
	var day = date.getDate();



	// parsovani pro cisla
	while(parse)
	{
		parse = false;
		
		// y ... rok jako dvojčíslí (00)
		pos = format.indexOf("y");
		if(pos>=0)
		{			
			format = pickerReplaceString(format, "y", pickerNumCharsString(year%100, 2), 0);
			parse = true;
		}
		
		// Y ... rok jako čtyřčíslí (2000)
		pos = format.indexOf("Y");
		if(pos>=0)
		{			
			format = pickerReplaceString(format, "Y", year, 0);
			parse = true;
		}
		
		// L ... 0 (nepřestupný rok) nebo 1 (přestupný rok)
		pos = format.indexOf("L");
		if(pos>=0)
		{
			tmp = 0;
			if(month==1 && ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)) tmp = 1;
			format = pickerReplaceString(format, "L", tmp, 0);
			parse = true;
		}
		
		// z ... číslo dne v roce (001-365)
		pos = format.indexOf("z");
		if(pos>=0)
		{
			tmp = 0;	// prestupny rok
			if(month==1 && ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)) tmp = 1;
			tmp2 = 0;
			for(var i=0;i<month;i++)
			{
				tmp2 += PICKER_MONTH_SIZES[i];
				if(i==1) tmp2 += tmp;
			}
			tmp2 += day;
			format = pickerReplaceString(format, "z", pickerNumCharsString(tmp2, 3), 0);
			parse = true;
		}
		
		// m ... číslo měsíce (01-12)
		pos = format.indexOf("m");
		if(pos>=0)
		{			
			format = pickerReplaceString(format, "m", pickerNumCharsString(month+1, 2), 0);
			parse = true;
		}
		
		// n ... číslo měsíce (bez případné úvodní nuly, 1-12)
		pos = format.indexOf("n");
		if(pos>=0)
		{			
			format = pickerReplaceString(format, "n", month+1, 0);
			parse = true;
		}
		
		// d ... číslo dne v měsíci (01-31)
		pos = format.indexOf("d");
		if(pos>=0)
		{			
			format = pickerReplaceString(format, "d", pickerNumCharsString(day, 2), 0);
			parse = true;
		}
		
		// j ... číslo dne v měsíci (bez případné úvodní nuly, 1-31)
		pos = format.indexOf("j");
		if(pos>=0)
		{			
			format = pickerReplaceString(format, "j", day, 0);
			parse = true;
		}
		
		// t ... počet dní v daném měsíci (28-31)
		pos = format.indexOf("t");
		if(pos>=0)
		{
			tmp = PICKER_MONTH_SIZES[month];
			if(month==1 && ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)) tmp = 29;
			format = pickerReplaceString(format, "t", tmp, 0);
			parse = true;
		}
		
		// w ... číslo dne v týdnu (0-6 nebo 1-7 v závislosti na verzi PHP - neděle má číslo 0 nebo 7)
		pos = format.indexOf("w");
		if(pos>=0)
		{			
			format = pickerReplaceString(format, "w", date.getDay(), 0);
			parse = true;
		}
		
		// h ... hodiny (01-12)
		pos = format.indexOf("h");
		if(pos>=0)
		{
			tmp = parseInt(date.getHours());
			tmp = tmp % 12;
			if(tmp == 0) tmp = 12;			
			format = pickerReplaceString(format, "h", pickerNumCharsString(tmp, 2), 0);
			parse = true;
		}		
		
		// g ... hodiny (bez případné úvodní nuly, 1-12)
		pos = format.indexOf("g");
		if(pos>=0)
		{
			tmp = parseInt(date.getHours());
			tmp = tmp % 12;
			if(tmp == 0) tmp = 12;			
			format = pickerReplaceString(format, "g", tmp, 0);
			parse = true;
		}	
		
		// H ... hodiny (01-23)
		pos = format.indexOf("H");
		if(pos>=0)
		{
			format = pickerReplaceString(format, "H", pickerNumCharsString(date.getHours(), 2), 0);
			parse = true;
		}
		
		// G ... hodiny (bez případné úvodní nuly, 1-23)
		pos = format.indexOf("G");
		if(pos>=0)
		{
			format = pickerReplaceString(format, "G", date.getHours(), 0);
			parse = true;
		}
		
		// i ... minuty (00-59)
		pos = format.indexOf("i");
		if(pos>=0)
		{
			format = pickerReplaceString(format, "i", pickerNumCharsString(date.getMinutes(), 2), 0);
			parse = true;
		}
		
		// s ... sekundy (00-59)
		pos = format.indexOf("s");
		if(pos>=0)
		{
			format = pickerReplaceString(format, "s", pickerNumCharsString(date.getSeconds(), 2), 0);
			parse = true;
		}
		
		// U ... počet sekund od 1. ledna 1970
		pos = format.indexOf("U");
		if(pos>=0)
		{
			tmp = date.getTime().toString();
			tmp = tmp.substr(0, tmp.length-3);
			format = pickerReplaceString(format, "U", tmp, 0);
			parse = true;
		}
	}
	


	// parsovani pro slova
	for(var i=0;i<format.length;++i)
	{		
		// M ... anglická zkratka názvu měsíce (Jul)
		if(format[i] == "M")
		{
			format = pickerReplaceString(format, "M", PICKER_MONTH_NAMES_SHORT[month], i);
			i += PICKER_MONTH_NAMES_SHORT[month].length - 1;
		}
		
		// F ... anglický název měsíce (July)
		else if(format[i] == "F")
		{
			format = pickerReplaceString(format, "F", PICKER_MONTH_NAMES[month], i);
			i += PICKER_MONTH_NAMES[month].length - 1;
		}
		
		// S ... anglická koncovka čísla dne v měsíci (st, nd, rd, th)
		else if(format[i] == "S")
		{
			if (day >= 11 && day <= 19)
				tmp = PICKER_DATE_SUFFIX[3]
			else if ( day % 10 == 1 )
				tmp = PICKER_DATE_SUFFIX[0]
			else if ( day % 10 == 2 )
				tmp = PICKER_DATE_SUFFIX[1]
			else if ( day % 10 == 3 )
				tmp = PICKER_DATE_SUFFIX[2]
			else
				tmp = PICKER_DATE_SUFFIX[3]
			format = pickerReplaceString(format, "S", tmp, i);
			i += tmp.length - 1;
		}	
		
		// D ... anglická zkratka názvu dne v týdnu (Mon)
		else if(format[i] == "D")
		{
			format = pickerReplaceString(format, "D", PICKER_DAY_NAMES_SHORT[date.getDay()], i);
			i += PICKER_DAY_NAMES_SHORT[date.getDay()].length - 1;
		}
		
		// l ... anglický název dne v týdnu (Monday)
		else if(format[i] == "l")
		{
			format = pickerReplaceString(format, "l", PICKER_DAY_NAMES[date.getDay()], i);
			i += PICKER_DAY_NAMES[date.getDay()].length - 1;
		}
		
		// a ... am/pm (dopoledne/odpoledne)
		else if(format[i] == "a")
		{
			tmp = parseInt(date.getHours());
			tmp2 = PICKER_DAY_AMPM[0];
			if(tmp>11) tmp2 = PICKER_DAY_AMPM[1];
			format = pickerReplaceString(format, "a", tmp2, i);
			i += tmp2.length - 1;
		}
		
		// A ... AM/PM (dopoledne/odpoledne)
		else if(format[i] == "A")
		{
			tmp = parseInt(date.getHours());
			tmp2 = PICKER_DAY_AMPM[0].toUpperCase();
			if(tmp>11) tmp2 = PICKER_DAY_AMPM[1].toUpperCase();
			format = pickerReplaceString(format, "A", tmp2, i);
			i += tmp2.length - 1;
		}
	}
	
	return format;
}
































/*********************************************************************************************************************/
/* DATE PICKER REFRESH                                                                                               */
/*********************************************************************************************************************/

function datePickerRefresh(id, format, year, month)
{
	var layout = datePickerLayout(id, format, year, month)
	var popup = document.getElementById(id+'-popup');
	popup.innerHTML = layout;
}



/*********************************************************************************************************************/
/* DATE PICKER INPUT PARSE                                                                                           */
/*********************************************************************************************************************/

function datePickerInputParse(inputText, format)
{
	var activeYear = null;
	var activeMonth = null;
	var activeDay = null;
	
	/*
		y ... rok jako dvojčíslí (00)
		Y ... rok jako čtyřčíslí (2000)
		m ... číslo měsíce (01-12)
		d ... číslo dne v měsíci (01-31)
		
		M ... anglická zkratka názvu měsíce (Jul)
		F ... anglický název měsíce (July)
		
		n ... číslo měsíce (bez případné úvodní nuly, 1-12)
		j ... číslo dne v měsíci (bez případné úvodní nuly, 1-31)
		U ... počet sekund od 1. ledna 1970
	*/
		
		
	// debugovat pro nesmyslny vstupy nebo neplatna data typu 31.2.2010
	// formatovani nepotrebnych znaku D

	var j=0;
	var k=0;
	var tmp;
	var pos;
	var err  = false;

	
	for(var i=0;i<format.length&&inputText!="";i++)
	{

		
		if(format[i] == "y")
		{
			tmp = inputText.substr(j, 2);
			activeYear = parseInt(tmp)+2000;
			j+=2;
		}
		else if(format[i] == "Y")
		{
			tmp = inputText.substr(j, 4);
			activeYear = parseInt(tmp);
			j+=4;
		}		
		else if(format[i] == "m")
		{
			tmp = inputText.substr(j, 2);
			if(tmp[0] == "0") tmp = tmp[1];
			activeMonth = parseInt(tmp)-1;
			j+=2;
		}
		else if(format[i] == "d")
		{
			tmp = inputText.substr(j, 2);
			if(tmp[0] == "0") tmp = tmp[1];
			activeDay = parseInt(tmp);
			j+=2;
		}
		else if(format[i] == "M")
		{
			for(k=0;k<PICKER_MONTH_NAMES_SHORT.length;k++)
			{
				pos = inputText.indexOf(PICKER_MONTH_NAMES_SHORT[k], j);
				if(pos != -1) break;
			}
			if(pos==-1)
			{
				err = true;
				break;
			}
			else
			{
				activeMonth = k;
				j+=PICKER_MONTH_NAMES_SHORT[k].length;
			}
		}
		else if(format[i] == "F")
		{
			for(k=0;k<PICKER_MONTH_NAMES.length;k++)
			{
				pos = inputText.indexOf(PICKER_MONTH_NAMES[k], j);
				if(pos != -1) break;
			}
			if(pos==-1)
			{
				err = true;
				break;
			}
			else
			{
				activeMonth = k;
				j+=PICKER_MONTH_NAMES[k].length;
			}
		}
		
		else if(format[i] == "j")
		{
			// zarazka
			var stop = format[i+1];
			
			// posledni prvek
			if(stop == undefined)
			{
				tmp = inputText.substr(j, inputText.length);
				activeDay = parseInt(tmp);
				j+=tmp.length;
			}
			else
			{
				// formatovaci znaky
				for(k=0;k<PICKER_FORMAT.length;k++)
				{
					if(stop == PICKER_FORMAT[k]) break;
				}
				// zarazka je formatovaci znak typu pismeno, tzn. MFSDlaA
				if(stop=="M" || stop=="F" || stop=="S" || stop=="D" || stop=="l" || stop=="a" || stop=="A")
				{
					pos = parseInt(inputText.substr(j+1, 1)); // druhy znak
					if(pos>=0 && pos<=9) tmp = inputText.substr(j, 2);
					else tmp = inputText.substr(j, 1);
					activeDay = parseInt(tmp);
					j+=tmp.length;
				}
				// zarazka je formatovaci znak typu cislo, tzn. mimo MFSDlaA
				else if(stop == PICKER_FORMAT[k])
				{
					err = true;
					break;
				}
				// zarazka je oddelovac
				else
				{
					pos = inputText.indexOf(stop, j); // pozice zarazky
					tmp = inputText.substring(j, pos);
					activeDay = parseInt(tmp);
					j+=tmp.length;
				}
			}
		}
		
		else if(format[i] == "n")
		{
			// zarazka
			var stop = format[i+1];
			
			// posledni prvek
			if(stop == undefined)
			{
				tmp = inputText.substr(j, inputText.length);
				activeMonth = parseInt(tmp)-1;
				j+=tmp.length;
			}
			else
			{
				// formatovaci znaky
				for(k=0;k<PICKER_FORMAT.length;k++)
				{
					if(stop == PICKER_FORMAT[k]) break;
				}
				// zarazka je formatovaci znak typu pismeno, tzn. MFSDlaA
				if(stop=="M" || stop=="F" || stop=="S" || stop=="D" || stop=="l" || stop=="a" || stop=="A")
				{
					pos = parseInt(inputText.substr(j+1, 1)); // druhy znak
					if(pos>=0 && pos<=9) tmp = inputText.substr(j, 2);
					else tmp = inputText.substr(j, 1);
					activeMonth = parseInt(tmp)-1;
					j+=tmp.length;
				}
				// zarazka je formatovaci znak typu cislo, tzn. mimo MFSDlaA
				else if(stop == PICKER_FORMAT[k])
				{
					err = true;
					break;
				}
				// zarazka je oddelovac
				else
				{
					pos = inputText.indexOf(stop, j); // pozice zarazky
					tmp = inputText.substring(j, pos);
					activeMonth = parseInt(tmp)-1;
					j+=tmp.length;
				}
			}
		}
		
		// formaty nemenici active
		else if(format[i]=="L" || format[i]=="w")
		{
			j++;
		}
		else if(format[i]=="t" || format[i]=="h" || format[i]=="H" || format[i]=="i" || format[i]=="s")
		{
			j+=2;
		}
		else if(format[i]=="z")
		{
			j+=3;
		}
		else if(format[i] == "S")
		{
			j+=PICKER_DATE_SUFFIX[0].length;
		}
		
		
		
		
		else if(format[i] == "D")
		{
			for(k=0;k<PICKER_DAY_NAMES_SHORT.length;k++)
			{
				pos = inputText.indexOf(PICKER_DAY_NAMES_SHORT[k], j);
				if(pos != -1) break;
			}
			if(pos==-1)
			{
				err = true;
				break;
			}
			else
			{
				j+=PICKER_DAY_NAMES_SHORT[k].length;
			}
		}
		else if(format[i] == "l")
		{
			for(k=0;k<PICKER_DAY_NAMES.length;k++)
			{
				pos = inputText.indexOf(PICKER_DAY_NAMES[k], j);
				if(pos != -1) break;
			}
			if(pos==-1)
			{
				err = true;
				break;
			}
			else
			{
				j+=PICKER_DAY_NAMES[k].length;
			}
		}
		else if(format[i] == "a")
		{
			for(k=0;k<PICKER_DAY_AMPM.length;k++)
			{
				pos = inputText.indexOf(PICKER_DAY_AMPM[k], j);
				if(pos != -1) break;
			}
			if(pos==-1)
			{
				err = true;
				break;
			}
			else
			{
				j+=PICKER_DAY_AMPM[k].length;
			}
		}
		else if(format[i] == "A")
		{
			for(k=0;k<PICKER_DAY_AMPM.length;k++)
			{
				pos = inputText.indexOf(PICKER_DAY_AMPM[k].toUpperCase(), j);
				if(pos != -1) break;
			}
			if(pos==-1)
			{
				err = true;
				break;
			}
			else
			{
				j+=PICKER_DAY_AMPM[k].length;
			}
		}
		
		
		
		
		
		else if(format[i] == "g")
		{
			// zarazka
			var stop = format[i+1];
			
			// posledni prvek
			if(stop == undefined)
			{
				tmp = inputText.substr(j, inputText.length);
				j+=tmp.length;
			}
			else
			{
				// formatovaci znaky
				for(k=0;k<PICKER_FORMAT.length;k++)
				{
					if(stop == PICKER_FORMAT[k]) break;
				}
				// zarazka je formatovaci znak typu pismeno, tzn. MFSDlaA
				if(stop=="M" || stop=="F" || stop=="S" || stop=="D" || stop=="l" || stop=="a" || stop=="A")
				{
					pos = parseInt(inputText.substr(j+1, 1)); // druhy znak
					if(pos>=0 && pos<=9) tmp = inputText.substr(j, 2);
					else tmp = inputText.substr(j, 1);
					j+=tmp.length;
				}
				// zarazka je formatovaci znak typu cislo, tzn. mimo MFSDlaA
				else if(stop == PICKER_FORMAT[k])
				{
					err = true;
					break;
				}
				// zarazka je oddelovac
				else
				{
					pos = inputText.indexOf(stop, j); // pozice zarazky
					tmp = inputText.substring(j, pos);
					j+=tmp.length;
				}
			}
		}
		else if(format[i] == "G")
		{
			// zarazka
			var stop = format[i+1];
			
			// posledni prvek
			if(stop == undefined)
			{
				tmp = inputText.substr(j, inputText.length);
				j+=tmp.length;
			}
			else
			{
				// formatovaci znaky
				for(k=0;k<PICKER_FORMAT.length;k++)
				{
					if(stop == PICKER_FORMAT[k]) break;
				}
				// zarazka je formatovaci znak typu pismeno, tzn. MFSDlaA
				if(stop=="M" || stop=="F" || stop=="S" || stop=="D" || stop=="l" || stop=="a" || stop=="A")
				{
					pos = parseInt(inputText.substr(j+1, 1)); // druhy znak
					if(pos>=0 && pos<=9) tmp = inputText.substr(j, 2);
					else tmp = inputText.substr(j, 1);
					j+=tmp.length;
				}
				// zarazka je formatovaci znak typu cislo, tzn. mimo MFSDlaA
				else if(stop == PICKER_FORMAT[k])
				{
					err = true;
					break;
				}
				// zarazka je oddelovac
				else
				{
					pos = inputText.indexOf(stop, j); // pozice zarazky
					tmp = inputText.substring(j, pos);
					j+=tmp.length;
				}
			}
		}
		else if(format[i] == "U")
		{
			// zarazka
			var stop = format[i+1];
			
			// posledni prvek
			if(stop == undefined)
			{
				tmp = inputText.substr(j, inputText.length);
				j+=tmp.length;
			}
			else
			{
				// formatovaci znaky
				for(k=0;k<PICKER_FORMAT.length;k++)
				{
					if(stop == PICKER_FORMAT[k]) break;
				}
				// zarazka je formatovaci znak typu pismeno, tzn. MFSDlaA
				if(stop=="M" || stop=="F" || stop=="S" || stop=="D" || stop=="l" || stop=="a" || stop=="A")
				{
					pos = parseInt(inputText.substr(j+1, 1)); // druhy znak
					if(pos>=0 && pos<=9) tmp = inputText.substr(j, 2);
					else tmp = inputText.substr(j, 1);
					j+=tmp.length;
				}
				// zarazka je formatovaci znak typu cislo, tzn. mimo MFSDlaA
				else if(stop == PICKER_FORMAT[k])
				{
					err = true;
					break;
				}
				// zarazka je oddelovac
				else
				{
					pos = inputText.indexOf(stop, j); // pozice zarazky
					tmp = inputText.substring(j, pos);
					j+=tmp.length;
				}
			}
		}
		
		
		
		else
		{
			//alert("ODDELOVAC:\nSYMBOL:" + format[i]  + "\nVYSLEDEK:" + (inputText[j])  + "\nI:" + i  + "\nJ:" + j  + "\nNEW J:" + (j+1));
			if(format[i]!=inputText[j])	// kontrola oddelovacu
			{
				err = true;
				break;
			}
			j++;
		}
	}


	// osetreni neplatnych hodnot
	if(!(activeYear>=0 && activeYear<=9999)) activeYear=null;
	if(!(activeMonth>=0 && activeMonth<=11)) activeMonth=null;
	if(!(activeDay>=0 && activeDay<=31)) activeDay=null;
	
	// kontrola delky
	if(j!=inputText.length) err = true;
	
	if(err)
	{
		activeYear = null;
		activeMonth = null;
		activeDay = null;
	}
	
	//alert("REPORT:\n" + activeYear + "\n" + activeMonth + "\n" + activeDay);

	//document.getElementById("test").value = "DEBUG: " + DEBUG;
	return [activeYear, activeMonth, activeDay];
}



/*********************************************************************************************************************/
/* DATE PICKER SET                                                                                                   */
/*********************************************************************************************************************/

function datePickerSet(element, format, year, month, day)
{	
	// nastaveni data a casu
	var date = new Date();
	date.setHours(0);
	date.setMinutes(0);
	date.setSeconds(0);
	date.setFullYear(year);
	date.setMonth(month);
	date.setDate(day);
	
	// parsovani formatovaciho retezce
	format = pickerParse(format, date);

	// ulozeni do textoveho pole a schovani popup okenka
	document.getElementById(element+'-popup').style.display = 'none';
	document.getElementById(element).value = format;
}



/*********************************************************************************************************************/
/* DATE PICKER LAYOUT                                                                                                */
/*********************************************************************************************************************/

function datePickerLayout(id, format, year, month)
{
	// pokud je v poli zadane nejake platne datum, zobrazi se vyznacene v kalendari
	var inputText = document.getElementById(id).value;	// obsah inputu
	var activeDate = datePickerInputParse(inputText, format);
	var activeYear = activeDate[0];
	var activeMonth = activeDate[1];
	var activeDay = activeDate[2];
	
	// dnesni datum
	var today = new Date();	
	
	// nastaveni zobrazovaneho roku a mesice
	if(year == null || month == null)
	{
		if(activeYear != null && activeMonth != null)	// z inputu znam rok i mesic
		{
			year = activeYear;
			month = activeMonth;
		}
		else if(activeYear != null && activeMonth == null)	// z inputu znam jen rok
		{
			year = activeYear;
			month = 0;
		}
		else // z inputu neznam nic
		{
			year = today.getFullYear();
			month = today.getMonth();
		}
	}

	// vykresleni kalendare
	var monthName = PICKER_MONTH_NAMES_SHORT[month];	// nazev aktualniho mesice
	var monthLength = PICKER_MONTH_SIZES[month];		// pocet dni aktualniho mesice
	if(month==1 && ((year % 4 == 0 && year % 100 != 0) || year % 400 == 0)) monthLength = 29;	// osetreni prestupneho roku	
	
	// prvni den v mesici
	var firstDay = new Date(year, month, 1);
	var startingDay = firstDay.getDay();
	
	//  predchozi/nasledujici mesic a rok
	var prevPrevYear;
	var prevPrevMonth;
	var prevYear;
	var prevMonth;
	var nextYear;
	var nextMonth;
	var nextNextYear;
	var nextNextMonth;
	
	// <<
	prevPrevYear = year-1;
	prevPrevMonth = month;
	// <
	if(month==0) { prevYear = year-1; prevMonth = 11; }
	else { prevYear = year; prevMonth = month-1; }
	// >
	if(month==11) { nextYear = year+1; nextMonth = 0; }
	else { nextYear = year; nextMonth = month+1; }
	// >>
	nextNextYear = year+1;
	nextNextMonth = month;	

	// html kod kalendare
	var calendar = '<table class="calendar year-' + year + ' month-' + (month+1) + '"><thead><tr>';
	
	calendar += '<th class="navi navi-year navi-prev"><a title="' + PICKER_NAVIGATION_TITLE[0] + '" href="javascript:datePickerRefresh(\'' + id + '\', \'' + format + '\', ' + prevPrevYear + ', ' + prevPrevMonth + ');">' + PICKER_NAVIGATION[0] + '</a></th>';
	calendar += '<th class="navi navi-month navi-prev"><a title="' + PICKER_NAVIGATION_TITLE[1] + '" href="javascript:datePickerRefresh(\'' + id + '\', \'' + format + '\', ' + prevYear + ', ' + prevMonth + ');">' + PICKER_NAVIGATION[1] + '</a></th>';
	calendar += '<th class="title" colspan=3><a title="' + PICKER_NAVIGATION_TITLE[4] + '" href="javascript:datePickerRefresh(\'' + id + '\', \'' + format + '\', ' + today.getFullYear() + ', ' + today.getMonth() + ');">' + monthName + "&nbsp;" + year + '</a></th>';
	calendar += '<th class="navi navi-month navi-next"><a title="' + PICKER_NAVIGATION_TITLE[2] + '" href="javascript:datePickerRefresh(\'' + id + '\', \'' + format + '\', ' + nextYear + ', ' + nextMonth + ');">' + PICKER_NAVIGATION[2] + '</a></th>';
	calendar += '<th class="navi navi-year navi-next"><a title="' + PICKER_NAVIGATION_TITLE[3] + '" href="javascript:datePickerRefresh(\'' + id + '\', \'' + format + '\', ' + nextNextYear + ', ' + nextNextMonth + ');">' + PICKER_NAVIGATION[3] + '</a></th>';
	
	calendar += '</tr></thead><tbody><tr>';
	
	for(var i=0;i<=6;i++)
	{
		calendar += '<th class="day ' + PICKER_DAY_NAMES_SHORT[i].toLowerCase() + '">';
		calendar += PICKER_DAY_NAMES_SHORT[i][0];
		calendar += '</th>';
	}
	
	calendar += '</tr><tr>';

	// vypis dnu do kalendare
	var day = 1;
	
	// tydny
	for (var i=0;i<9;i++)
	{
		// dny
		for (var j=0;j<=6;j++)
		{ 
			var activeFlag = "";
			var todayFlag = "";
			var dateFlag = "";
			var title;
			
			// aktivni?
			if(year==activeYear && month==activeMonth && day==activeDay)
				activeFlag = "active ";
			
			// dnes?
			if(year==today.getFullYear() && month==today.getMonth() && day==today.getDate())
				todayFlag = "today ";
				
			// datum
			if (day <= monthLength && (i > 0 || j >= startingDay))
				dateFlag = "date-" + day + " ";
			else
				dateFlag = "date-0 ";
				
			// title
			title = day + " " + PICKER_MONTH_NAMES[month] + " " + year;
			
			calendar += '<td class="date ' + dateFlag + PICKER_DAY_NAMES_SHORT[j].toLowerCase() + " " + activeFlag + todayFlag + '">';
			if (day <= monthLength && (i > 0 || j >= startingDay))
			{
				calendar += '<a title="' + title + '" href="javascript:datePickerSet(\'' + id + '\', \'' + format + '\', ' + year + ', ' + month + ', ' + day + ');">' + day + '</a>';
				day++;
			}
			calendar += '</td>';
		}
		
		// ukonceni vypisu
		if (day > monthLength) break; 
		else calendar += '</tr><tr>';
	}
	
	calendar += '</tr></tbody></table>';
	
	return calendar;
}



/*********************************************************************************************************************/
/* DATE PICKER                                                                                                       */
/*********************************************************************************************************************/

function datePicker(id, format, editable)
{
	// osetreni parametru
	if(format == null) format = "Y-m-d";
	if(editable == null) editable = true;
	
	// pridani tridy textovemu poli
	document.getElementById(id).setAttribute('class', 'picker-date');
	
	// pridani tlacitka
	var button = document.createElement("a");
	button.innerHTML = "Choose date";
	button.setAttribute('id', id+'-button');
	button.setAttribute('class', 'picker-date-button');
	button.setAttribute('href', '#');
	button.setAttribute('onclick', ' pickerShowPopup("'+ id + '", datePickerLayout("' + id + '", "' + format + '")); return false;' );
	button.setAttribute('title', 'Choose date');
	document.getElementById(id).parentNode.appendChild(button);
		
	// pozice tlacitka
	var position = pickerFindPos(document.getElementById(id+'-button'));
	var disX = document.getElementById(id+'-button').offsetWidth;
	
	// pridani okenka kalendare
	var popup = document.createElement("div");
	popup.setAttribute('id', id+'-popup');
	popup.setAttribute('class', 'picker-date-popup');
	document.getElementById(id).parentNode.appendChild(popup);
	
	// editable pole
	if(!editable) document.getElementById(id).setAttribute('readonly', '');
	
	// zobrazeni popup
	pickerShowPopup(id, datePickerLayout(id, format));
}






















/*********************************************************************************************************************/
/* TIME PICKER SET                                                                                                   */
/*********************************************************************************************************************/

function timePickerSet(element, format, time)
{
	// nastaveni data a casu
	var date = new Date();
	if(time>=0 && time<24)
	{
		date.setHours(time);
		date.setMinutes(0);
		date.setSeconds(0);
	}

	// parsovani formatovaciho retezce
	format = pickerParse(format, date);

	// ulozeni do textoveho pole a schovani popup okenka
	document.getElementById(element+'-popup').style.display = 'none';
	document.getElementById(element).value = format;
}



/*********************************************************************************************************************/
/* TIME PICKER LAYOUT                                                                                                */
/*********************************************************************************************************************/

function timePickerLayout(id, format)
{
	var inputText = document.getElementById(id).value;		// obsah inputu
	var title;												// title	
	var activeFlag;											// aktivni prvek
	var pairFlag;											// sudy/lichy prvek
	var timeFlag;											// cas
	
	// nastaveni obsahu popup okenka
	var layout = '<table class="clock"><tbody>';
	for(var i=0;i<PICKER_TIME_VALUES.length && PICKER_TIME.length==PICKER_TIME_VALUES.length;i++)
	{
		// nastaveni data a casu
		var date = new Date();
		if(PICKER_TIME_VALUES[i]>=0 && PICKER_TIME_VALUES[i]<24)
		{
			date.setHours(PICKER_TIME_VALUES[i]);
			date.setMinutes(0);
			date.setSeconds(0);
		}
		
		// sudy/lichy radek
		if(i%2 == 0) pairFlag = "odd";
		else pairFlag = "even";
		
		// aktivni ?
		if(pickerParse(format, date) == inputText) activeFlag = " active";
		else activeFlag = "";
		
		// cas
		timeFlag = "time-" + PICKER_TIME_VALUES[i] + " ";
		
		// title
		title = date.getHours().toString() + ":" + pickerNumCharsString(date.getMinutes(), 2);

		layout += '<tr><td class="time ' + timeFlag + pairFlag + activeFlag + '">';
		layout += '<a title="' + title + '" href="javascript:timePickerSet(\'' + id + '\', \'' + format + '\', ' + PICKER_TIME_VALUES[i] + ');">' + PICKER_TIME[i] + '</a>';
		layout += '</td></tr>';
	}
	layout += '</tbody></table>';
	
	return layout;
}



/*********************************************************************************************************************/
/* TIME PICKER                                                                                                       */
/*********************************************************************************************************************/

function timePicker(id, format, editable)
{
	// osetreni parametru
	if(format == null) format = "H:i:s";
	if(editable == null) editable = true;
	
	// pridani tridy textovemu poli
	document.getElementById(id).setAttribute('class', 'picker-time');
	
	// pridani tlacitka
	var button = document.createElement("a");
	button.innerHTML = "Choose time";
	button.setAttribute('id', id+'-button');
	button.setAttribute('class', 'picker-time-button');
	button.setAttribute('href', '#');
	button.setAttribute('onclick', ' pickerShowPopup("'+ id + '", timePickerLayout("' + id + '", "' + format + '")); return false;' );
	button.setAttribute('title', 'Choose time');
	document.getElementById(id).parentNode.appendChild(button);
	
	// pozice tlacitka
	var position = pickerFindPos(document.getElementById(id+'-button'));
	var disX = document.getElementById(id+'-button').offsetWidth;

	// pridani okenka kalendare
	var popup = document.createElement("div");
	popup.setAttribute('id', id+'-popup');
	popup.setAttribute('class', 'picker-time-popup');
	document.getElementById(id).parentNode.appendChild(popup);
	
	// editable pole
	if(!editable) document.getElementById(id).setAttribute('readonly', '');
	
	// zobrazeni popup
	pickerShowPopup(id, timePickerLayout(id, format));
}


