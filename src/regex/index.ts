/**
 * Per the W3C HTML5 specification: https://html.spec.whatwg.org/multipage/forms.html#valid-e-mail-address
 * - Note: This requirement is a willful violation of RFC 5322, which defines a syntax for e-mail addresses that is simultaneously too strict (before the “@” character), too vague (after the “@” character), and too lax (allowing comments, whitespace characters, and quoted strings in manners unfamiliar to most users) to be of practical use here.
 *
 * - [a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]  Captures one or more characters that are allowed in the username part of the email address. This includes alphanumeric characters, special characters, and certain punctuation marks.
 * - @ Matches the @ symbol that separates the username and domain.
 * - [a-zA-Z0-9] Captures a single alphanumeric character, representing the first character of the domain name.
 * - (?: Starts a non-capturing group for optional domain sections.
 * - [a-zA-Z0-9-]{0,61}[a-zA-Z0-9]  Captures a domain section that consists of alphanumeric characters and hyphens. It allows between 0 and 61 characters, ensuring that the total length does not exceed 63 characters.
 * - )?  Ends the non-capturing group for the optional domain section, making it optional.
 * - (?:  Starts a non-capturing group for optional subdomains.
 * - \.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?  Captures a subdomain section that starts with a dot (.) followed by an alphanumeric character. It allows between 0 and 61 characters of alphanumeric characters and hyphens. The entire subdomain section is optional.
 * - )*  Ends the non-capturing group for the optional subdomains. This allows for zero or more occurrences of subdomain sections.
 */
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * - /^(?=.{3,48}$)(?![-_.])(?!^0*\.?0*$)[a-zA-Z0-9-_.]+$/
 * - (?=.{3,48}$) ensures the string is between 3 and 20 characters long.
 * - (?![-_.]) ensures the string does not start with a hyphen, underscore, or period.
 * - (?!^0*\.?0*$) ensures the string does not consist entirely of zeroes.
 * - [a-zA-Z0-9-_.]+ matches alphanumeric characters, hyphens, underscores, and periods.
 * - ^ and $ ensure that the entire string matches the regex.
 */
const USERNAME_REGEX = /^(?=.{3,48}$)(?![-_.])(?!^0*\.?0*$)[a-zA-Z0-9-_.]+$/;

/**
 * - /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])(?!.*\s).{8,32}$/
 * - (?=.*[A-Z]) ensures that there is at least one uppercase letter.
 * - (?=.*[a-z]) ensures that there is at least one lowercase letter.
 * - (?=.*[0-9]) ensures that there is at least one number.
 * - (?=.*[!@#$%^&*]) ensures that there is at least one special character.
 * - (?!.*\s) ensures that there are no spaces.
 * - .{8,32} ensures that the password is between 8 and 32 characters long.
 * - ^ and $ ensure that the entire string matches the regex.
 */
const PASSWORD_REGEX =
  /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])(?!.*\s).{8,32}$/;

/**
 * - /^[A-Za-z\s.\-']{2,30}$/i
 * - [A-Za-z\s.\-'] matches any letter, whitespace, period, hyphen, or apostrophe.
 * - {2,30} ensures that the text is between 2 and 30 characters long.
 * - ^ and $ ensure that the entire string matches the regex.
 * - i makes the regex case-insensitive.
 */
const NAME_REGEX = /^[A-Za-z\s.\-']{2,30}$/i;

/**
 * - /^[A-Za-z\s.\-']{2,100}$/i
 * - [A-Za-z\s.\-'] matches any letter, whitespace, period, hyphen, or apostrophe.
 * - {2,100} ensures that the text is between 2 and 100 characters long.
 * - ^ and $ ensure that the entire string matches the regex.
 * - i makes the regex case-insensitive.
 */
const FULL_NAME_REGEX = /^[A-Za-z\s.\-']{2,100}$/i;

/**
 * @see https://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
 * - https? matches "http" or "https". The "?" makes the "s" character optional, allowing for both "http" and "https" protocols.
 * - :\/\/ matches "://".
 * - (www\.)? matches "www." or nothing.
 * - [-a-zA-Z0-9@:%._+~#=]{1,256} matches any letter, number, or symbol in the brackets, between 1 and 256 times.
 * - \. matches ".".
 * - [a-zA-Z0-9()]{1,6} matches any letter, number, or symbol in the brackets, between 1 and 6 times.
 * - \b ensures that the URL ends at a word boundary.
 * - ([-a-zA-Z0-9()@:%_+.~#?&//=]*) matches any letter, number, or symbol in the brackets, between 0 and infinity times.
 */
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

/**
 * - /^[A-Za-z\s.\-']{2,75}$/i
 * - [A-Za-z\s.\-'] matches any letter, whitespace, period, hyphen, or apostrophe.
 * - {2,75} ensures that the text is between 2 and 75 characters long.
 * - ^ and $ ensure that the entire string matches the regex.
 * - i makes the regex case-insensitive.
 */
const CITY_REGEX = /^[A-Za-z\s.\-']{2,75}$/i;

/**
 * - /^\d{1,6}$/
 * - ^ asserts that the string starts with a digit.
 * - \d{1,6} matches between 1 and 6 digits. This represents the whole number part of a number, allowing for a range of digit lengths from 1 to 6.
 * - $ asserts that the string ends with a digit.
 */
const INTEGER_REGEX = /^\d{1,6}$/;

/**
 * - /^(?=.*[0-9])\d{1,6}(?:[,.]\d{0,2})?$/
 * - ^ asserts that the string starts with a digit.
 * - (?=.*[0-9]) is a positive lookahead assertion that requires the presence of at least one digit. This ensures that the string contains at least one digit.
 * - \d{1,6} matches between 1 and 6 digits. This represents the whole number part of a number, allowing for a range of digit lengths from 1 to 6.
 * - (?:[,.]\d{0,2})? is a non-capturing group that matches a decimal point or comma followed by between 0 and 2 digits. This represents the decimal part of a number, allowing for a range of digit lengths from 0 to 2. The entire group is optional, allowing for whole numbers.
 * - $ asserts that the string ends with a digit.
 */
const FLOAT_REGEX = /^\d{1,6}(?:[,.]\d{0,2})?$/;

/**
 * - /^(Admin|Employee|Manager)$/
 * - matches the following user roles: Admin, Employee, Manager
 * - ^ and $ ensure that the entire string matches the regex.
 */
const USER_ROLES_REGEX = /^(Admin|Employee|Manager)$/;

/**
 * - /^(?![0-9])[^"'\s\\]{1,75}$/;
 * - (?![0-9]) ensures that the first character is not a digit.
 * - [^"'\s\\] ensures that the input does not contain any of the following characters: ", ', whitespace, \.
 * - {1,75} matches the preceding token between 1 and 75 times.
 * - ^ and $ ensure that the entire string matches the regex.
 * ex: 'username' or 'username123' or 'username-123' or 'u123-sername'
 */
const OBJECT_KEY_REGEX = /^(?![0-9])[^"'\s\\]{1,75}$/;

/**
 * - /^(?!^$|^0*$)[0-9]{1,2}$/
 * - (?!^$|^0*$): Negative lookahead assertion to ensure that the entire string is not empty (^$) or consists entirely of zeroes (^0*$).
 * - [0-9]{1,2}: Matches one to two digits for the integral part
 * - ^ and $ ensure that the entire string matches the regex.
 * - ex: 12
 */
const SMALL_INTEGER_REGEX = /^(?!^$|^0*$)[0-9]{1,2}$/;

/**
 * - /^(?!^$|^0*$)[0-9]{1,4}$/
 * - (?!^$|^0*$): Negative lookahead assertion to ensure that the entire string is not empty (^$) or consists entirely of zeroes (^0*$).
 * - [0-9]{1,4}: Matches one to four digits for the integral part
 * - ^ and $ ensure that the entire string matches the regex.
 * - ex: 1234
 */
const MEDIUM_INTEGER_REGEX = /^(?!^$|^0*$)[0-9]{1,4}$/;

/**
 * - /^(?!^$|^0*$)[0-9]{1,6}$/
 * - (?!^$|^0*$): Negative lookahead assertion to ensure that the entire string is not empty (^$) or consists entirely of zeroes (^0*$).
 * - [0-9]{1,6}: Matches one to six digits for the integral part of the quantity.
 * - ^ and $ ensure that the entire string matches the regex.
 * - ex: 123456
 */
const LARGE_INTEGER_REGEX = /^(?!^$|^0*$)[0-9]{1,6}$/;

/**
 * - /^(All Locations|Calgary|Edmonton|Vancouver)$/
 * - matches the following store locations:All Locations, Calgary, Edmonton, Vancouver
 * - ^ and $ ensure that the entire string matches the regex.
 */
const STORE_LOCATION_REGEX = /^(All Locations|Calgary|Edmonton|Vancouver)$/;

/**
 * - /^(Chief Executive Officer|Chief Operations Officer|Chief Financial Officer|Chief Technology Officer|Chief Marketing Officer|Chief Sales Officer|Chief Human Resources Officer)$/
 * - matches the following executive management positions: Chief Executive Officer, Chief Operations Officer, Chief Financial Officer, Chief Technology Officer, Chief Marketing Officer, Chief Sales Officer, Chief Human Resources Officer
 * - ^ and $ ensure that the entire string matches the regex.
 */
const EXECUTIVE_MANAGEMENT_REGEX =
  /^(Chief Executive Officer|Chief Operations Officer|Chief Financial Officer|Chief Technology Officer|Chief Marketing Officer|Chief Sales Officer|Chief Human Resources Officer)$/;

/**
 * - /^(Human Resources Manager|Compensation and Benefits Specialist|Health and Safety Specialist|Training Specialist|Recruiting Specialist)$/
 * - matches the following human resources positions: Human Resources Manager, Compensation and Benefits Specialist, Health and Safety Specialist, Training Specialist, Recruiting Specialist
 * - ^ and $ ensure that the entire string matches the regex.
 */
const HUMAN_RESOURCES_REGEX =
  /^(Human Resources Manager|Compensation and Benefits Specialist|Health and Safety Specialist|Training Specialist|Recruiting Specialist)$/;

/**
 * - /^(Executive Management|Store Administration|Office Administration|Accounting|Human Resources|Sales|Marketing|Information Technology|Repair Technicians|Field Service Technicians|Logistics and Inventory|Customer Service|Maintenance)$/
 * - matches the following department names: Executive Management, Store Administration, Office Administration, Accounting, Human Resources, Sales, Marketing, Information Technology, Repair Technicians, Field Service Technicians, Logistics and Inventory, Customer Service, Maintenance
 * - ^ and $ ensure that the entire string matches the regex.
 */
const DEPARTMENT_REGEX =
  /^(Executive Management|Store Administration|Office Administration|Accounting|Human Resources|Sales|Marketing|Information Technology|Repair Technicians|Field Service Technicians|Logistics and Inventory|Customer Service|Maintenance)$/;

/**
 * - /^(Store Manager|Shift Supervisor|Office Manager)$/
 * - matches the following store administration positions: Store Manager, Shift Supervisor, Office Manager
 * - ^ and $ ensure that the entire string matches the regex.
 */
const STORE_ADMINISTRATION_REGEX =
  /^(Store Manager|Shift Supervisor|Office Manager)$/;

/**
 * - /^(Office Administrator|Receptionist|Data Entry Specialist)$/
 * - matches the following office administration positions: Office Administrator, Receptionist, Data Entry Specialist
 * - ^ and $ ensure that the entire string matches the regex.
 */
const OFFICE_ADMINISTRATION_REGEX =
  /^(Office Administrator|Receptionist|Data Entry Specialist)$/;

/**
 * - /^(Accounting Manager|Accounts Payable Clerk|Accounts Receivable Clerk|Financial Analyst)$/
 * - matches the following accounting positions: Accounting Manager, Accounts Payable Clerk, Accounts Receivable Clerk, Financial Analyst
 * - ^ and $ ensure that the entire string matches the regex.
 */
const ACCOUNTING_REGEX =
  /^(Accounting Manager|Accounts Payable Clerk|Accounts Receivable Clerk|Financial Analyst)$/;

/**
 * - /^(Sales Manager|Sales Representative|Business Development Specialist|Sales Support Specialist|Sales Operations Analyst)$/
 * - matches the following sales positions: Sales Manager, Sales Representative, Business Development Specialist, Sales Support Specialist, Sales Operations Analyst
 * - ^ and $ ensure that the entire string matches the regex.
 */
const SALES_REGEX =
  /^(Sales Manager|Sales Representative|Business Development Specialist|Sales Support Specialist|Sales Operations Analyst)$/;

/**
 * - /^(Marketing Manager|Digital Marketing Specialist|Graphic Designer|Public Relations Specialist|Marketing Analyst)$/
 * - matches the following marketing positions: Marketing Manager, Digital Marketing Specialist, Graphic Designer, Public Relations Specialist, Marketing Analyst
 * - ^ and $ ensure that the entire string matches the regex.
 */
const MARKETING_REGEX =
  /^(Marketing Manager|Digital Marketing Specialist|Graphic Designer|Public Relations Specialist|Marketing Analyst)$/;

/**
 * - /^(IT Manager|Systems Administrator|IT Support Specialist|Database Administrator|Web Developer|Software Developer|Software Engineer)$/
 * - matches the following information technology positions: IT Manager, Systems Administrator, IT Support Specialist, Database Administrator, Web Developer, Software Developer, Software Engineer
 * - ^ and $ ensure that the entire string matches the regex.
 */
const INFORMATION_TECHNOLOGY_REGEX =
  /^(IT Manager|Systems Administrator|IT Support Specialist|Database Administrator|Web Developer|Software Developer|Software Engineer)$/;

/**
 * - /^(Repair Technicians Supervisor|Electronics Technician|Computer Technician|Smartphone Technician|Tablet Technician|Audio\/Video Equipment Technician)$/
 * - matches the following repair technician positions: Repair Technicians Supervisor, Electronics Technician, Computer Technician, Smartphone Technician, Tablet Technician, Audio/Video Equipment Technician
 * - ^ and $ ensure that the entire string matches the regex.
 */
const REPAIR_TECHNICIANS_REGEX =
  /^(Repair Technicians Supervisor|Electronics Technician|Computer Technician|Smartphone Technician|Tablet Technician|Audio\/Video Equipment Technician)$/;

/**
 * - /^(Field Service Supervisor|On-Site Technician)$/
 * - matches the following field service technician positions: Field Service Supervisor, On-Site Technician
 * - ^ and $ ensure that the entire string matches the regex.
 */
const FIELD_SERVICE_TECHNICIANS_REGEX =
  /^(Field Service Supervisor|On-Site Technician)$/;

/**
 * - /^(Warehouse Supervisor|Inventory Clerk|Delivery Driver|Parts and Materials Handler|Shipper\/Receiver)$/
 * - matches the following logistics and inventory positions: Warehouse Supervisor, Inventory Clerk, Delivery Driver, Parts and Materials Handler, Shipper/Receiver
 * - ^ and $ ensure that the entire string matches the regex.
 */
const LOGISTICS_AND_INVENTORY_REGEX =
  /^(Warehouse Supervisor|Inventory Clerk|Delivery Driver|Parts and Materials Handler|Shipper\/Receiver)$/;

/**
 * - /^(Customer Service Supervisor|Customer Service Representative|Technical Support Specialist)$/
 * - matches the following customer service positions: Customer Service Supervisor, Customer Service Representative, Technical Support Specialist
 * - ^ and $ ensure that the entire string matches the regex.
 */
const CUSTOMER_SERVICE_REGEX =
  /^(Customer Service Supervisor|Customer Service Representative|Technical Support Specialist)$/;

/**
 * - /^(Maintenance Supervisor|Maintenance Worker|Custodian)$/
 * - matches the following maintenance positions: Maintenance Supervisor, Maintenance Worker, Custodian
 * - ^ and $ ensure that the entire string matches the regex.
 */
const MAINTENANCE_REGEX =
  /^(Maintenance Supervisor|Maintenance Worker|Custodian)$/;

const JOB_POSITION_REGEX =
  /^(Chief Executive Officer|Chief Operations Officer|Chief Financial Officer|Chief Technology Officer|Chief Marketing Officer|Chief Sales Officer|Chief Human Resources Officer|Human Resources Manager|Compensation and Benefits Specialist|Health and Safety Specialist|Training Specialist|Recruiting Specialist|Store Manager|Shift Supervisor|Office Manager|Office Administrator|Receptionist|Data Entry Specialist|Accounting Manager|Accounts Payable Clerk|Accounts Receivable Clerk|Financial Analyst|Sales Manager|Sales Representative|Business Development Specialist|Sales Support Specialist|Sales Operations Analyst|Marketing Manager|Digital Marketing Specialist|Graphic Designer|Public Relations Specialist|Marketing Analyst|IT Manager|Systems Administrator|IT Support Specialist|Database Administrator|Web Developer|Software Developer|Software Engineer|Repair Technicians Supervisor|Electronics Technician|Computer Technician|Smartphone Technician|Tablet Technician|Audio\/Video Equipment Technician|Field Service Supervisor|On-Site Technician|Warehouse Supervisor|Inventory Clerk|Delivery Driver|Parts and Materials Handler|Shipper\/Receiver|Customer Service Supervisor|Customer Service Representative|Technical Support Specialist|Maintenance Supervisor|Maintenance Worker|Custodian)$/;

/**
 * -  /^(All Products|Accessory|Central Processing Unit \(CPU\)|Computer Case|Desktop Computer|Display|Graphics Processing Unit \(GPU\)|Headphone|Keyboard|Laptop|Memory \(RAM\)|Microphone|Motherboard|Mouse|Power Supply Unit \(PSU\)|Smartphone|Speaker|Storage|Tablet|Webcam)$/
 * - matches the following product categories: Accessory, Central Processing Unit (CPU), Computer Case, Desktop Computer, Display, Graphics Processing Unit (GPU), Headphone, Keyboard, Laptop, Memory (RAM), Microphone, Motherboard, Mouse, Power Supply Unit (PSU), Smartphone, Speaker, Storage, Tablet, Webcam
 * - ^ and $ ensure that the entire string matches the regex.
 */
const PRODUCT_CATEGORY_REGEX =
  /^(All Products|Accessory|Central Processing Unit \(CPU\)|Computer Case|Desktop Computer|Display|Graphics Processing Unit \(GPU\)|Headphone|Keyboard|Laptop|Memory \(RAM\)|Microphone|Motherboard|Mouse|Power Supply Unit \(PSU\)|Smartphone|Speaker|Storage|Tablet|Webcam)$/;

/**
 * - /^(All Repairs|Accessory|Computer Component|Peripheral|Electronic Device|Mobile Device|Audio\/Video)$/
 * - matches the following repair categories: Accessory, Computer Component, Peripheral, Electronic Device, Mobile Device, Audio/Video
 * - ^ and $ ensure that the entire string matches the regex.
 */
const REPAIR_CATEGORY_REGEX =
  /^(All Repairs|Accessory|Computer Component|Peripheral|Electronic Device|Mobile Device|Audio\/Video)$/;

/**
 * - /^(All Locations|Calgary|Edmonton|Vancouver)$/
 * - matches the following store locations: All Locations, Calgary, Edmonton, Vancouver
 * - ^ and $ ensure that the entire string matches the regex.
 * - ex: All Locations
 */
const ALL_STORE_LOCATIONS_REGEX =
  /^(All Locations|Calgary|Edmonton|Vancouver)$/;

/**
 * - /^(January|February|March|April|May|June|July|August|September|October|November|December)$/
 * - matches the following months: January, February, March, April, May, June, July, August, September, October, November, December
 * - ^ and $ ensure that the entire string matches the regex.
 * - ex: January
 * - Note: This regex is used to validate month names in the product metrics.
 */
const MONTHS_REGEX =
  /^(January|February|March|April|May|June|July|August|September|October|November|December)$/;

/**
 * - /^(2013|2014|2015|2016|2017|2018|2019|2020|2021|2022|2023|2024|2025)$/
 * - matches the following years: 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
 * - ^ and $ ensure that the entire string matches the regex.
 * - ex: 2023
 * - Note: This regex is used to validate years in the product metrics.
 */
const YEARS_REGEX =
  /^(2013|2014|2015|2016|2017|2018|2019|2020|2021|2022|2023|2024|2025)$/;

/**
 * - /^(0[1-9]|[12][0-9]|3[01])$/
 * - matches the following days: 01, 02, 03, ..., 31
 * - ^ and $ ensure that the entire string matches the regex.
 * - ex: 01
 * - Note: This regex is used to validate days in the product metrics.
 */
const DAYS_REGEX = /^(0[1-9]|[12][0-9]|3[01])$/;

/**
 * - /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/
 * - matches the following Canadian postal code format: A1A 1A1 or A1A1A1
 */
const POSTAL_CODE_CANADA_REGEX = /^[A-Za-z]\d[A-Za-z][ ]?\d[A-Za-z]\d$/;

/**
 * - /^\d{5}(-\d{4})?$/
 * - matches the following US postal code format: 12345 or 12345-6789
 * - ^ asserts that the string starts with a digit.
 * - \d{5} matches exactly 5 digits.
 * - (-\d{4})? is an optional group that matches a hyphen followed by exactly 4 digits.
 * - $ asserts that the string ends with a digit.
 */
const POSTAL_CODE_US_REGEX = /^\d{5}(-\d{4})?$/;

/**
 * - /^[A-Za-z0-9\s.,#-]+$/
 * - contains only letters, numbers, spaces, periods, commas, and hyphens.
 * - ^ and $ ensure that the entire string matches the regex.
 */
const ADDRESS_LINE_REGEX = /^[A-Za-z0-9\s.,#-]+$/;

/**
 * - /^(Canada|UnitedStates)$/
 * - matches the following countries: Canada, United States
 * - ^ and $ ensure that the entire string matches the regex.
 */
const COUNTRY_REGEX = /^(Canada|United States)$/;

/**
 * - /^(Not Applicable|Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Ontario|Prince Edward Island|Quebec|Saskatchewan)$/
 * - matches the following provinces: Not Applicable, Alberta, British Columbia, Manitoba, New Brunswick, Newfoundland and Labrador, Nova Scotia, Ontario, Prince Edward Island, Quebec, Saskatchewan
 * - ^ and $ ensure that the entire string matches the regex.
 */
const PROVINCE_REGEX =
  /^(Not Applicable|Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland and Labrador|Nova Scotia|Ontario|Prince Edward Island|Quebec|Saskatchewan|Northwest Territories|Nunavut|Yukon)$/;

/**
 * - /^(Not Applicable|Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia)$/
 * - ^ and $ ensure that the entire string matches the regex.
 */
const STATES_US_REGEX =
  /^(Not Applicable|Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)$/;

/**
 * - /^[a-zA-Z0-9\s.,'()-]{1,50}$/i
 * - [a-zA-Z0-9\s.,'()-] matches any letter, digit, whitespace, period, comma, single quotation mark, hyphen, or parentheses.
 * - {1,50} ensures that the text is between 1 and 50 characters long.
 * - ^ and $ ensure that the entire string matches the regex.
 * - i makes the regex case-insensitive.
 */
const FILE_NAME_REGEX = /^[a-zA-Z0-9\s.,'()-]{1,50}$/i;

/**
 * - /\.(jpg|jpeg|png|webp)$
 * - \. matches a period.
 * - (jpg|jpeg|png|webp) matches either "jpg", "jpeg", "png", or "webp".
 * - $ asserts that the string ends with one of the file extensions.
 */
const FILE_EXTENSIONS_REGEX = /\.(jpg|jpeg|png|webp)$/;

/**
 * - /^\d{1,6}$/
 * - ^ asserts that the string starts with a digit.
 * - \d{1,6} matches between 1 and 6 digits. This represents the file size in bytes, allowing for a range of digit lengths from 1 to 6.
 * - $ asserts that the string ends with a digit.
 * - technically a SI prefix is used here, as binary size of 1MB = 1,048,576 bytes
 */
const FILE_SIZE_REGEX = /^\d{1,6}$/;

/**
 * - /^image\/(jpeg|png|webp)$/
 * - ^ asserts that the string starts with "image/".
 * - (jpeg|png|webp) matches either "jpeg", "png", or "webp".
 * - $ asserts that the string ends with one of the file extensions.
 */
const FILE_MIME_TYPES_REGEX = /^image\/(jpeg|png|webp)$/;

/**
 * - /^(7bit|8bit|binary|quoted-printable|base64)$/
 * - (7bit|8bit|binary|quoted-printable|base64) matches either "7bit", "8bit", "binary", "quoted-printable", or "base64".
 * - ^ asserts that the string starts with one of the file encodings.
 * - $ asserts that the string ends with one of the file encodings.
 */
const FILE_ENCODING_REGEX = /^(7bit|8bit|binary|quoted-printable|base64)$/;

export {
  ACCOUNTING_REGEX,
  ADDRESS_LINE_REGEX,
  ALL_STORE_LOCATIONS_REGEX,
  CITY_REGEX,
  COUNTRY_REGEX,
  CUSTOMER_SERVICE_REGEX,
  DAYS_REGEX,
  DEPARTMENT_REGEX,
  EMAIL_REGEX,
  EXECUTIVE_MANAGEMENT_REGEX,
  FIELD_SERVICE_TECHNICIANS_REGEX,
  FILE_ENCODING_REGEX,
  FILE_EXTENSIONS_REGEX,
  FILE_MIME_TYPES_REGEX,
  FILE_NAME_REGEX,
  FILE_SIZE_REGEX,
  FLOAT_REGEX,
  FULL_NAME_REGEX,
  HUMAN_RESOURCES_REGEX,
  INFORMATION_TECHNOLOGY_REGEX,
  INTEGER_REGEX,
  JOB_POSITION_REGEX,
  LARGE_INTEGER_REGEX,
  LOGISTICS_AND_INVENTORY_REGEX,
  MAINTENANCE_REGEX,
  MARKETING_REGEX,
  MEDIUM_INTEGER_REGEX,
  MONTHS_REGEX,
  NAME_REGEX,
  OBJECT_KEY_REGEX,
  OFFICE_ADMINISTRATION_REGEX,
  PASSWORD_REGEX,
  POSTAL_CODE_CANADA_REGEX,
  POSTAL_CODE_US_REGEX,
  PRODUCT_CATEGORY_REGEX,
  PROVINCE_REGEX,
  REPAIR_CATEGORY_REGEX,
  REPAIR_TECHNICIANS_REGEX,
  SALES_REGEX,
  SMALL_INTEGER_REGEX,
  STATES_US_REGEX,
  STORE_ADMINISTRATION_REGEX,
  STORE_LOCATION_REGEX,
  URL_REGEX,
  USER_ROLES_REGEX,
  USERNAME_REGEX,
  YEARS_REGEX,
};
