// SKY FIELD — State, data tables and start-up code, in their original order. Loaded after all app-*.js function files.
// Runs top to bottom like the original index.html script did.
// ══════════════════════════════════════════════════════════════════
// Secure authentication and approved-team cloud synchronization.
// Supabase Auth manages the session. Row Level Security in `sf_user_store`
// allows only approved Sky Field accounts to use the shared company rows.
// The browser keeps a local cache for speed and offline resilience.
// ══════════════════════════════════════════════════════════════════
// Suggest a meaningful PDF file name in the browser print dialog.
// Quotation: Client Company + Quotation Number
// Proforma: Client Company + Proforma Invoice Number
// Note: the browser/operating system may still allow the user to change the name.
const SF_APP_WINDOW_TITLE = document.title;
let sfPreviewTitleActive = false;

const SF_USER_STORE_TABLE = 'sf_user_store';
const SF_STORAGE_BUCKET = 'company-documents';
const SF_NORMALIZED_TABLES = {projects:'sf_projects',quotations:'sf_quotations',invoices:'sf_invoices',payments:'sf_payments',engineers:'sf_engineers',payroll:'sf_payroll_sheets',expenses:'sf_expenses',documents:'sf_documents'};
// Commercial access of the signed-in account, read from the database (sf_my_access) at sign-in by unified-shell.js
// and managed on the Users & Permissions page. Empty when signed out.
let SF_TEAM_MEMBERS = {};
// sfNavOpenGroups (which sidebar groups are open) belongs to each device, not to the whole workspace.
const SF_LOCAL_ONLY_KEYS = new Set(['sfActiveUserId','sfLastModule','sfNormalizedMigrationV1','sfNavOpenGroups']);
// Rebuilt in place after sign-in (sfReloadApplicationStateFromLocal and the attendance roster refresh),
// so a change to them alone does not reload the page.
const SF_REFRESHED_IN_PLACE_KEYS = new Set(['sfEngineers','sfPayrollSheets','sfDeletedDefaultEngineerIds']);
// Shared commercial collections must never be uploaded as whole-array blobs:
// one stale browser could otherwise replace records created by a teammate.
// Each record is synchronized separately with an optimistic revision check.
const SF_PER_RECORD_SYNCED_KEYS = new Set(['sfSavedQuotations','sfProjects','sfProformaInvoices']);
let sfQuoteSyncSnapshots = new Map(); // quote id -> last cloud-synced payload signature
let sfProjectSyncSnapshots = new Map(); // project id -> last cloud-synced payload signature
let sfInvoiceSyncSnapshots = new Map(); // proforma id -> last cloud-synced payload signature
let sfNormalizedTablesAvailable = true;
let sfCurrentUser = null;
let sfWorkspaceUserId = '';
let sfSyncPaused = false;
let sfAuthReady = false;
let sfActivationPromise = null;
let sfActivationUserId = '';
let sfAccessDeniedMessage = '';

// Wrap localStorage.setItem so existing application saves are mirrored to
// the signed-in user's private cloud store without rewriting every module.
(function(){
  const origSetItem=localStorage.setItem.bind(localStorage);
  localStorage.setItem=function(key,value){ origSetItem(key,value); if(!sfSyncPaused&&sfShouldSyncKey(key)){sfPendingMark(key);sfCloudPush(key);} };
})();

// ── DATA ──────────────────────────────────────────────────────────────────────
const ACTS = {"13.8 kV Switchgear":[["BB Contact Resistance","33.SWGXX.BB.CR",0.5,"Feeder"],["CB Timing Test","33.SWGXX.CB",1,"CB"],["ES Contact Resistance","33.SWGXX.ES.CR",0.25,"Earth Switch"],["Meter","33.SWGXX.M",1,"Meter"],["CT Test","33.SWGXX.CT.TEST",0.25,"1 Core 1 Phase"],["CT Secondary Injection","33.SWGXX.CT.SI",0.25,"1 Core 1 Phase"],["CT Primary Injection","33.SWGXX.CT.PI",2,"Bay One Phase"],["VT Test","33.SWGXX.VT.TEST",3,"VT 3 Phase"],["HV Test","33.SWGXX.VT",2.5,"Section"],["MCB and MCCB","33.SWGXX.MCB",0.25,"MCB"],["Auxiliary Relay","33.SWGXX.AUX",0.5,"Unit"],["Scheme Check","33.SWGXX.SCH",8,"Feeder"]],"High Voltage Switchgear":[["SF6 Gas Purity & Dew Point","EHV.SWGXX.SF6.TEST",0.25,"Compartment"],["SF6 Gas Leakage Test","EHV.SWGXX.SF6.LEK",0.5,"Bay"],["SF6 Density Gauge Calibration","EHV.SWGXX.SF6.DG",0.5,"Gauge"],["Contact Resistance","EHV.SWGXX.CR",1,"Bay"],["CB Timing Test","EHV.SWGXX.CB",2,"CB"],["ES & DS","EHV.SWGXX.DS&ES",4,"Bay"],["CT Test","EHV.SWGXX.CT.TEST",0.5,"1 Core 1 Phase"],["CT Secondary Injection","EHV.SWGXX.CT.SI",1,"1 Core 1 Phase"],["CT Primary Injection","EHV.SWGXX.CT.PI",1,"1 Core 1 Phase"],["VT Test","EHV.SWGXX.VT.TEST",3,"VT 3 Phase"],["HV Test","EHV.SWGXX.HVT",0.5,"Bay"],["LCC Scheme Check","EHV.SWGXX.LCC.SCH",24,"Bay"]],"HV Power Transformer":[["Visual Inspection","HV.TRXX.VI",2,"Transformer"],["DC Insulation Resistance","HV.TRXX.IR",4,"Transformer"],["Winding Resistance","HV.TRXX.WR",6,"Transformer"],["Transformer Turns Ratio","HV.TRXX.TTR",4,"Transformer"],["Short Circuit & Zero Seq. Impedance","HV.TRXX.AC",4,"Transformer"],["Dissipation Factor (Tan d)","HV.TRXX.DF",4,"Transformer"],["Mechanical Protection Devices","HV.TRXX.MD",16,"Transformer"],["Winding & Oil Temp. Calibration","HV.TRXX.WT-OT",8,"Transformer"],["Oil Dielectric Breakdown","HV.TRXX.ODBT",2,"Transformer"],["On-Line Gas Analyzer","HV.TRXX.GADT",4,"Device"],["Fans, Pumps, MCCBs, Aux Relays","HV.TRXX.MMAM",8,"Transformer"],["Bushing CT","HV.TRXX.BCT",16,"Transformer"],["BCT Secondary Circuits","HV.TRXX.BCT-SEC",8,"Transformer"],["Neutral Earthing Resistance (NER)","HV.TRXX.NER",4,"Transformer"],["Oil Leak Test With Pressure","HV.TRXX.PT",8,"Transformer"],["FRA","HV.TRXX.FRA",8,"Transformer"],["DGA Oil Sample","HV.TRXX.DGA",1,"Transformer"],["On Load Tap Changer (OLTC)","HV.TRXX.OLTC",8,"Transformer"]],"HV Power Transformer Protection":[["Main 1 Relay Acceptance Test","HV.TRPXX.MULTI-1.A",32,"Relay"],["Main 1 Relay Final Setting Test","HV.TRPXX.MULTI-1.F",16,"Relay"],["Main 2 Relay Acceptance Test","HV.TRPXX.MULTI-2.A",32,"Relay"],["Main 2 Relay Final Setting Test","HV.TRPXX.MULTI-2.F",16,"Relay"]],"HV Line Protection":[["Main 1 Relay Acceptance Test","HV.LPXX.MULTI-1.A",32,"Relay"],["Main 1 Relay Final Setting Test","HV.LPXX.MULTI-1.F",24,"Relay"],["Main 2 Relay Acceptance Test","HV.LPXX.MULTI-2.A",32,"Relay"],["Main 2 Relay Final Setting Test","HV.LPXX.MULTI-2.F",24,"Relay"]],"HV Bus Bar Protection":[["High Impedance BBP","HV.BBPXX.HI-1",8,"Relay"],["Metrosil","HV.BBPXX.MS",0.5,"Unit"],["CT Supervision Relay Test","HV.BBPXX.CTSUP",3,"Relay"]],"13.8 kV Bus Bar Protection":[["BBP High Impedance Relay","33.BBPXX.HI",8,"Relay"],["Metrosil","33.BBPXX.MS",1,"Unit"],["CT Supervision Relay Test For BBP","33.BBPXX.CTSUP",3,"Relay"]],"13.8 kV Feeder Protection":[["OC & EF Relay Acceptance Test","33.FPXX.OC.A",4,"Relay"],["OC & EF Relay Final Setting Test","33.FPXX.OC.F",1,"Relay"]],"13.8 kV Load Shedding":[["Under Frequency Relay Acceptance Test","13.LSXX.UF.A",8,"Relay"],["Under Frequency Relay Final Setting Test","13.LSXX.UF.F",4,"Relay"],["Under Voltage Relay Acceptance Test","13.LSXX.UV.A",8,"Relay"],["Under Voltage Relay Final Setting Test","13.LSXX.UV.F",4,"Relay"]],"ACDB":[["Component","ACDBXX.COMP",6,"Panel"],["Contact Resistance","ACDBXX.CR",0.25,"Panel"],["Protection Relay Acceptance Test","ACDBXX.PRA",6,"Relay"],["Protection Relay Final Setting Test","ACDBXX.PRF",1,"Relay"],["Scheme Check","ACDBXX.SCH",16,"ATS"],["High Voltage Test","ACDBXX.HV.Test",1,"Lot"]],"DCDB":[["Contact Resistance","DCDBXX.CR",0.25,"Panel"],["Scheme Check","DCDBXX.SCH",4,"Panel"],["Insulation Resistance Test","DCDB.IR.TEST",1,"Lot"],["Components","DCDBXX.COMP",4,"Panel"]],"Substation Battery Bank":[["Battery Bank Test","SBBXX.TEST",12,"Battery"]],"Substation Battery Charger":[["Battery Charger Test","SBCXX.TEST",12,"Charger"]],"Battery Monitoring":[["Battery Monitoring Panel","SBCXX.TEST",3,"Panel"]],"SAS Equipment Check":[["Fiber Optical Cables Test","SASXX.EQ.FO",32,"Lot"],["Maintenance Laptop Check","SASXX.EQ.MLAP",2,"Laptop"],["SAS Panels Inspection","SASXX.EQ.PI",1,"Panel"],["SAS Computers Check","SASXX.EQ.COMP",2,"Computer"],["Ethernet Switch Check","SASXX.EQ.ETHS",0.5,"Switch"],["GPS Check","SASXX.EQ.GPS",1,"GPS"],["IED Test","SASXX.EQ.IED",2,"IED"]],"SAS Function Test":[["Redundancy Test","SASXX.FUN.RED",12,"Lot"],["Measurement Test","SASXX.FUN.MEAS",1.5,"IED"],["Time Synchronization Test","SASXX.FUN.TSYNC",0.5,"IED"],["HV Closed Loop Test","SASXX.FUN.CLT.HV",1,"IED"],["Basic Function Check - SAS HMI","SASXX.FUN.HMI",8,"HMI"],["Cyber Security Test","SASXX.FUN.CST",8,"Lot"]],"Final Trip Test":[["Final Trip Test For HV","FTTXX.HV",8,"Bay"],["Final Trip Test For 13.8 kV","FTTXX.13",1,"Feeder"],["Final Trip Test For 33 kV","FTTXX.33",8,"Feeder"],["Final Trip Test For HV BBP","FTTXX.HV.BBP",6,"Zone"],["Final Trip Test For HV CBF","FTTXX.HV.CBFP",1,"CB"],["Final Trip Test For 13.8 kV Load Shedding","FTTXX.13.LS",6,"LS"],["Final Trip Test For 33 kV Load Shedding","FTTXX.33.LS",6,"LS"],["Final Trip Test For ACDB","FTTXX.ACDB",1,"Panel"]],"Stand Alone CT":[["MV Stand Alone CT","CTXX.MV.TEST",0.5,"Phase"],["MV CT Primary Injection","CTXX.MV.PI",1,"Phase"],["MV CT Secondary Injection","CTXX.MV.SI",1,"Core"],["EHV Stand Alone CT","CTXX.EHV.TEST",0.5,"Phase"],["EHV CT Primary Injection","CTXX.EHV.PI",1,"Phase"],["EHV CT Secondary Injection","CTXX.EHV.SI",1,"Core"]],"Power Cable":[["MV Cable Test","PCABLEXX.MV.TEST",2,"Per Phase"],["MV Cable HV Test","PCABLEXX.MV.HV",1,"Per Phase"],["MV Cable PD Test","PCABLEXX.MV.PD",1,"Per Phase"]],"Scheme Check":[["HV Line Protection","SCH.HV.LPXX",24,"Feeder"],["HV Power Transformer Protection","SCH.HV.TRPXX",24,"Transformer"],["HV BBP/CBF","SCH.HV.BBP/CBF",32,"Set"],["33 kV Load Shedding","SCH.33.LSXX",24,"LS"],["13.8 kV Load Shedding","SCH.13.LSXX",24,"LS"]],"Stability Test":[["HV Bus Bar Protection","STAB.HV.BBPXX",4,"Bay"],["33 kV Bus Bar Protection","STAB.33.BBPXX",2,"Feeder"],["13.8 kV Bus Bar Protection","STAB.13.BBPXX",2,"Feeder"],["HV Transformer Differential / REF","STAB.HV.TXXDIF",16,"Transformer"]],"Normalization Before Energization":[["Normalization - HV","NORXX.HV",2,"Panel"],["Normalization - 13.8 kV","NORXX.13",1,"Panel"],["Normalization - 33 kV","NORXX.33",1,"Panel"]],"Energization":[["Energization For HV","ENERGXX.HV",2,"Bay"],["Energization For 13.8 kV","ENERGXX.13",1,"Section"],["Energization For 33 kV","ENERGXX.33",1,"Section"]],"Final Trip Test (Alternate)":[["Final Trip Test For HV","FTTXX.HV",8,"Bay"],["Final Trip Test For 33 kV BBP & CBF","FTTXX.33.BBP",3,"Section"]],"On Load Test":[["On Load Test For HV","OLTXX.HV",2,"Bay"],["On Load Test For 13.8 kV","OLTXX.13",0.5,"Feeder"],["On Load Test For 33 kV","OLTXX.33",0.5,"Feeder"]],"End of Commissioning Documents":[["Documents Preparation - HV","DOC.HV",24,"Lot"],["Documents Preparation - 33 kV","DOC.33",16,"Lot"],["Documents Preparation - 13.8 kV","DOC.13",16,"Lot"]]};

// Equipment comes from the Equipment Library (equipment-library.js).

// Canonical T&C set used by the legacy approved quotation format. Keep this
// order stable: customer-facing numbering (including clauses 22 and 26) is
// intentionally tied to the sequence below. The Payment row is replaced at
// runtime by the payment option selected in the Conditions tab.
const TESTING_CONDS = [
  ["Payment Terms: 15% advance payment shall be made upon Purchase Order issuance. The remaining 85% shall be invoiced monthly based on the approved percentage of completed work and shall be paid within 30 days from the invoice date.","Payment",true],
  ["Invoices not settled within 30 days of the invoice date will be subject to a formal follow-up notice. If payment remains outstanding beyond 45 days, Sky Field Company reserves the right to pause site activities until payment is regularized, with reasonable prior notice to the Client.","Payment – Late",true],
  ["All bank transfer charges, LC amendment fees (if applicable), and related financial charges are the sole responsibility of the Client.","Payment – Bank",true],
  ["The Client's official Purchase Order must include complete invoicing details (contact name, email, telephone, and billing address) for invoice issuance.","Payment – PO",true],
  ["This quotation is valid for 30 days from the date of issue. Beyond this period, Sky Field Company should be consulted to reconfirm resource availability and pricing validity.","Validity",true],
  ["All prices are exclusive of Value Added Tax (VAT) at 15%, which will be applied in accordance with applicable Saudi tax regulations.","VAT",true],
  ["Scope of work is strictly limited to the commissioning and testing activities explicitly listed in this quotation. Any scope not mentioned herein is excluded unless agreed in writing prior to execution.","Scope",true],
  ["The Client/main contractor shall ensure the site is fully ready for testing and commissioning prior to Sky Field Company's mobilization. This includes: completed installation, meggering, wiring and termination verification, availability of approved drawings, relay final settings confirmed, DC system energized or with sufficient DC source available, and all interfacing cables connected and reflected in drawings.","Site Readiness",true],
  ["Site coordination, Client/consultant witnessing, scheduling of test start times, Safety Officer, QC Inspector, PTW/LOA Receiver, required shutdowns and isolations, work permits, gate passes, site inductions, and security/site access permissions are excluded from Sky Field Company's scope and shall be arranged by the Client/main contractor in advance, unless specifically included in Sky Field Company's quoted Scope of Work.","Exclusions – Permits",true],
  ["A minimum of one (1) week's advance written notice is required for mobilization of Sky Field Company's engineers and test equipment, following receipt of the Purchase Order and applicable advance payment.","Mobilization",true],
  ["Sky Field Company reserves the right to demobilize any of its engineers from site upon one (1) week's advance written notice to the Client/main contractor.","Demobilization",true],
  ["Standard working hours are 8 hours/day, 6 days/week (Saturday-Thursday). During Ramadan, standard working hours are 6 hours/day.","Working Hours",true],
  ["Overtime beyond standard working hours will be charged at 1.5x the normal hourly rate. Work performed on Fridays and official public holidays will be charged at 2x the normal hourly rate.","Overtime",true],
  ["Any idle or standby time caused by the Client/main contractor/end client, including site unreadiness, unavailable permits, approved drawings, relay settings, required power supply, site access, witnessing, shutdowns/isolations, or interface readiness, shall count toward the agreed project duration. If such delay extends the work beyond the agreed duration, the applicable Daily/Monthly Rates stated in Clause 22 shall apply.","Idle Time",true],
  ["Any delay, suspension, or stoppage caused by pandemics, epidemics, government actions, force majeure, or similar events beyond Sky Field Company's reasonable control shall entitle Sky Field Company to a reasonable extension of time and shall not be treated as delay attributable to Sky Field Company. Reasonable additional costs resulting from standby, extended accommodation, extended equipment rental, or remobilization shall be separately chargeable following written notification to the Client; where applicable, time-extension rates shall follow Clause 22 and remobilization charges shall follow Clause 26.","Force Majeure",true],
  ["Test equipment calibration certificates for all Sky Field Company equipment will be provided upon request and shall be valid at time of use. All test equipment shall be calibrated by an approved calibration authority.","Calibration",true],
  ["All commissioning and testing activities shall be conducted in accordance with IEC, IEEE, and applicable Saudi Aramco / SEC standards relevant to the project scope.","Standards",true],
  ["Repeated testing, replacement, installation, or modification not caused by Sky Field Company's error or fault is excluded from this scope. Re-testing required due to unavailable Client/consultant witnessing, changes to relay settings or approved drawings, wiring modifications by others, equipment or vendor defects, or a Client/end-client request to repeat an already completed test shall be treated as additional work and shall be subject to a written Variation/Change Order in accordance with Clause 20.","Repetition",true],
  ["This offer excludes any material or equipment delivery/procurement.","Exclusions – Material",true],
  ["Prices quoted are for the Scope of Work listed in this quotation only. Any change, addition, or reduction in scope, quantities, or specifications shall be separately priced and time-assessed, and requires a written variation order prior to execution.","General – Variation",true],
  ["Quoted lump-sum prices are not subject to deduction if work is completed ahead of the estimated duration, and remain payable in full regardless of the completion percentage reached at the end of the agreed work duration, provided the duration was not exceeded due to reasons attributable to Sky Field Company.","General – Lump Sum",true],
  ["If the work extends beyond the agreed duration for reasons not attributable to Sky Field Company, additional services will be charged at the daily or monthly rate stated in the commercial offer.","General – Extension Rates",true],
  ["If a project is suspended or placed on hold for more than 2 continuous months for reasons not attributable to Sky Field Company, the contract may be closed at the current percentage of completion, and any remaining activities shall be re-quoted at then-current prices.","General – Suspension",true],
  ["The Client/main contractor shall provide throughout the duration of works: safe site access, required AC and DC power supply, suitable office and secure storage for equipment and files, toilet facilities (minimum 1 per 5 engineers), internet, telephone, drinking water, and parking for Sky Field Company's team. Scaffolding, manlifts, cranes, lifting arrangements, temporary access platforms, and any special site facilities required for safe execution of the testing activities shall also be provided by the Client/main contractor unless specifically included in this quotation.","General – Facilities",true],
  ["The Client/main contractor shall provide a qualified assistant technician for each Sky Field Company testing engineer, and two technicians for each transformer testing engineer, with relevant electrical substation experience. All proposed support personnel are subject to interview and approval by the Sky Field Company team leader.","General – Assistants",true],
  ["Mobilization and demobilization costs are included as stated in this quotation. Any additional round-trip mobilization required after the initial demobilization, including for energization support or other additional site attendance, will be charged as an extra at the agreed per-person round-trip rate.","General – Mobilization & Demobilization",true],
  ["In accordance with Kingdom of Saudi Arabia regulations, all outdoor testing activities must be suspended between 12:00 PM and 3:00 PM during the period of 15 June to 15 September each year.","General – Outdoor Work",true],
  ["Sky Field Company's engineers will observe official Kingdom of Saudi Arabia public holiday dates.","General – Public Holidays",true],
  ["Test formats and test procedures shall be prepared by Sky Field Company and forwarded to the Client/main contractor for submission to the end client for review and approval prior to commencement of testing.","General – Test Formats",true],
  ["Sky Field Company shall submit daily, weekly, and monthly progress reports as agreed with the Client. In the event of any delay, a recovery plan shall be submitted promptly.","General – Progress Reporting",true],
  ["Commissioning test reports shall be submitted to the Client within 7 working days of each test completion, and the final commissioning report within 7 working days after final energization.","General – Report Submission",true],
  ["As-built and modification markings shall be made by Sky Field Company on one (1) commissioning copy of drawings provided on-site by the main contractor.","General – As-Built",true],
  ["All stationery, printed test formats, blank paper, folders, separators, and consumables required for documentation shall be arranged and provided by the main contractor.","General – Documentation",true],
  ["Sky Field Company is not liable for any consequential, indirect, or special damages or losses of any kind, including but not limited to: loss of revenue, loss of use, loss of production, costs of capital, or costs connected with interruption of operations.","Liability",true],
  ["In the event that a problem related to Sky Field Company's completed scope is identified after demobilization, Sky Field Company will rectify it at no additional charge if notified within 30 days of the work completion date. Beyond this period, any rectification shall be treated as new work and quoted separately.","General – Rectification",true],
  ["Cleaning and general housekeeping of the work area are not within Sky Field Company's scope of work.","General – Housekeeping",true],
  ["Manufacturer representation, special manufacturer tools, OEM-specific software or support equipment are excluded from this offer and shall be arranged by the main contractor/client unless explicitly stated otherwise.","General – OEM Exclusions",true],
  ["Engineering, configuration, parameterization, or creation of SCD/CID files for protection IEDs, and any SAS/SCADA integration, communication engineering, cybersecurity scope, or telecom configuration are excluded from this offer unless explicitly listed in the scope of work.","General – Engineering Exclusions",true],
  ["All numerical relays and controllers shall be configured to basic configuration and kept ready for testing by the main contractor or manufacturer prior to Sky Field Company's testing activities.","General – Relay Readiness",true],
  ["As a matter of business ethics, the Client/main contractor shall not directly recruit, solicit, or offer employment to any Sky Field Company engineer or staff member for a period of 2 years from the date of project completion.","Non-Solicit",true],
  ["No form of performance bond or back-charge will be accepted unless explicitly agreed in writing at the time of quotation issuance.","General – Bond",true],
  ["Any Purchase Order or service order issued against this quotation shall reference this quotation number and shall be considered based on the Scope of Work, prices, and commercial conditions stated herein. Any additional or conflicting terms contained in the Purchase Order shall not be binding on Sky Field Company unless expressly accepted by Sky Field Company in writing.","General – PO Reference",true],
  ["Operation of circuit breakers and motor drives for GIS equipment is the sole responsibility of the manufacturer's representative and is excluded from this scope.","General – GIS Operation",true],
  ["Earthing system step-and-touch potential testing, fault recorder configuration/testing, OHL parameter testing, and media converter testing are excluded from this offer unless explicitly listed in the Scope of Work.","General – Special Tests",true],
  ["No other subcontractor shall be permitted to perform work within Sky Field Company's scope without prior written agreement with Sky Field Company.","General – Other Subcontractors",true],
  ["The Client/main contractor shall ensure protection relay final settings, the approved alarm list (SPL), and all required AC/DC power sources are confirmed and available prior to Sky Field Company's mobilization.","General – Protection Readiness",true]
];

const ENGINEER_RENTAL_CONDS = [
  ["Prices are exclusive of 15% VAT, which will be added in accordance with the applicable Saudi tax regulations.","VAT",true],
  ["This quotation is valid for 30 days from the date of issue and is subject to confirmation of the engineer's availability at the time of Purchase Order issuance.","Validity",true],
  ["This quotation is for the rental of an engineer on a continuous monthly basis and is not a daily-rate engagement.","Rental Basis",true],
  ["The rental period shall start from the date the LOA/work permit is opened for the engineer. All days thereafter, including idle, waiting, or standby days while the permit remains active, shall be considered chargeable.","LOA Start Date",true],
  ["Any additional period beyond one completed month, up to 15 calendar days, shall be calculated using the applicable daily rate. Any additional period exceeding 15 calendar days shall be considered and charged as one full additional month.","Additional Days",true],
  ["Any idle day, waiting day, site stoppage, or day during which the engineer is available but cannot work for reasons not attributable to Sky Field Company shall be counted as a chargeable day.","Idle Time",true],
  ["Transportation and accommodation for the rental engineer shall be arranged and borne by Sky Field Company, unless otherwise stated in the commercial offer.","Accommodation",true],
  ["The Client shall provide safe site access, work permits, gate passes, inductions, PPE requirements, approved drawings/settings, suitable workplace facilities, and all coordination required for the engineer to perform the assigned duties.","Client Responsibilities",true],
  ["The engineer shall perform only the agreed role and scope stated in the quotation. Any change in role, authorization level, location, shift pattern, or scope requires Sky Field Company's prior written approval and may be subject to revised pricing.","Scope",true],
  ["Standard working hours are 8 hours per day, 6 days per week. Ramadan working hours and official holidays shall follow applicable Saudi regulations.","Working Hours",true],
  ["Overtime beyond standard working hours shall be charged at 1.5 times the normal hourly rate. Work on Fridays and official public holidays shall be charged at 2 times the normal hourly rate, unless otherwise agreed.","Overtime",true],
  ["A monthly timesheet shall be prepared and submitted to the Client for signature. The signed timesheet will be the basis for invoicing and shall be returned without unreasonable delay.","Timesheet",true],
  ["Invoices shall be issued monthly based on the signed timesheet and shall be payable within 30 days from the invoice date, unless different payment terms are stated in the commercial offer.","Payment",true],
  ["If an invoice remains unpaid after 30 days, Sky Field Company may issue a formal payment follow-up. If payment remains outstanding beyond 45 days, Sky Field Company may suspend or demobilize the engineer after reasonable prior written notice.","Payment – Late",true],
  ["All bank transfer charges and Letter of Credit amendment fees, where applicable, shall be borne by the Client.","Payment – Bank",true],
  ["The Client's Purchase Order must include complete invoicing details and must reference this quotation number.","Payment – PO",true],
  ["Sky Field Company may replace the assigned engineer with another suitably qualified engineer when reasonably necessary, subject to applicable project approval requirements.","Replacement",true],
  ["Either party may request demobilization by giving reasonable written notice. Charges shall remain applicable through the engineer's confirmed demobilization date, including any applicable additional-day or monthly charge.","Demobilization",true],
  ["The engineer remains an employee of Sky Field Company. The Client shall not directly recruit, solicit, or employ the engineer during the assignment and for 2 years after completion without prior written agreement.","Non-Solicit",true],
  ["Sky Field Company shall not be liable for indirect, consequential, or special losses, including loss of production, revenue, use, or delay costs.","Liability",true],
  ["Delays, travel restrictions, government actions, unsafe site conditions, or force majeure events beyond Sky Field Company's reasonable control shall entitle Sky Field Company to a reasonable extension and reimbursement of resulting additional costs.","Force Majeure",true]
];

// Reviewed Arabic equivalents. Array positions intentionally mirror the
// approved English clauses so legacy numbering (especially 22 and 26) stays
// stable in English, Arabic, and bilingual quotation output.
const TESTING_CONDS_AR = [
  "شروط الدفع: تُدفع دفعة مقدمة بنسبة 15% عند إصدار أمر الشراء، وتُفوتر النسبة المتبقية البالغة 85% شهريًا وفق نسبة الأعمال المنجزة والمعتمدة، وتُسدد خلال 30 يومًا من تاريخ الفاتورة.",
  "تخضع الفواتير غير المسددة خلال 30 يومًا من تاريخ الفاتورة لإشعار متابعة رسمي. وإذا استمر عدم السداد لأكثر من 45 يومًا، يحق لشركة سماء الميدان إيقاف أنشطة الموقع مؤقتًا إلى حين تسوية المستحقات، بعد توجيه إشعار مسبق معقول إلى العميل.",
  "يتحمل العميل وحده جميع رسوم التحويلات البنكية ورسوم تعديل الاعتماد المستندي، إن وجدت، وأي رسوم مالية ذات صلة.",
  "يجب أن يتضمن أمر الشراء الرسمي الصادر من العميل بيانات الفوترة كاملة، بما في ذلك اسم جهة الاتصال والبريد الإلكتروني ورقم الهاتف وعنوان الفوترة، ليتسنى إصدار الفواتير.",
  "يسري عرض السعر لمدة 30 يومًا من تاريخ إصداره. وبعد انتهاء هذه المدة يجب الرجوع إلى شركة سماء الميدان لإعادة تأكيد توافر الموارد وسريان الأسعار.",
  "جميع الأسعار لا تشمل ضريبة القيمة المضافة بنسبة 15%، وتُضاف الضريبة وفق الأنظمة الضريبية السعودية السارية.",
  "يقتصر نطاق العمل حصرًا على أنشطة الاختبارات والتشغيل المدرجة صراحةً في هذا العرض. ويُستثنى أي نطاق غير مذكور ما لم تتم الموافقة عليه كتابيًا قبل التنفيذ.",
  "يلتزم العميل أو المقاول الرئيسي بالتأكد من جاهزية الموقع بالكامل للاختبارات والتشغيل قبل تعبئة موارد شركة سماء الميدان، ويشمل ذلك اكتمال التركيبات، واختبارات العزل، والتحقق من التوصيلات والنهايات، وتوافر الرسومات المعتمدة، واعتماد الإعدادات النهائية للمرحلات، وتشغيل نظام التيار المستمر أو توفير مصدر تيار مستمر كافٍ، وربط جميع كابلات الواجهات وإظهارها في الرسومات.",
  "لا يشمل نطاق شركة سماء الميدان تنسيق الموقع، أو ترتيب حضور العميل أو الاستشاري، أو جدولة بدء الاختبارات، أو توفير مسؤول السلامة، أو مفتش الجودة، أو مستلم تصريح العمل أو LOA، أو أعمال الفصل والعزل المطلوبة، أو تصاريح العمل، أو تصاريح الدخول، أو التعريف بالموقع، أو الموافقات الأمنية وموافقات الدخول. ويتولى العميل أو المقاول الرئيسي ترتيبها مسبقًا ما لم تكن مشمولة صراحةً في نطاق عرض شركة سماء الميدان.",
  "يلزم إرسال إشعار كتابي مسبق قبل أسبوع واحد على الأقل لتعبئة مهندسي شركة سماء الميدان وأجهزة الاختبار، وذلك بعد استلام أمر الشراء والدفعة المقدمة المطبقة.",
  "تحتفظ شركة سماء الميدان بحق سحب أي من مهندسيها من الموقع بعد توجيه إشعار كتابي مسبق لمدة أسبوع واحد إلى العميل أو المقاول الرئيسي.",
  "ساعات العمل القياسية هي 8 ساعات يوميًا ولمدة 6 أيام أسبوعيًا من السبت إلى الخميس. وخلال شهر رمضان تكون ساعات العمل القياسية 6 ساعات يوميًا.",
  "تُحتسب ساعات العمل الإضافية بعد ساعات العمل القياسية بمعدل 1.5 من سعر الساعة العادي، ويُحتسب العمل أيام الجمعة والعطلات الرسمية بمعدل ضعفي سعر الساعة العادي.",
  "تُحتسب ضمن مدة المشروع المتفق عليها جميع فترات التوقف أو الانتظار الناتجة عن العميل أو المقاول الرئيسي أو العميل النهائي، بما في ذلك عدم جاهزية الموقع، أو عدم توافر التصاريح أو الرسومات المعتمدة أو إعدادات المرحلات أو مصادر القدرة المطلوبة أو الدخول للموقع أو جهة الحضور، أو عدم توافر الفصل والعزل أو جاهزية الواجهات. وإذا أدى ذلك إلى تجاوز المدة المتفق عليها، فتطبق الأسعار اليومية أو الشهرية الواردة في البند 22.",
  "أي تأخير أو تعليق أو توقف ناتج عن جائحة أو وباء أو إجراء حكومي أو قوة قاهرة أو أحداث مماثلة خارجة عن السيطرة المعقولة لشركة سماء الميدان يمنح الشركة تمديدًا زمنيًا معقولًا، ولا يُعد تأخيرًا منسوبًا إليها. وتُحتسب بصورة منفصلة التكاليف الإضافية المعقولة الناتجة عن الانتظار أو تمديد السكن أو تمديد استئجار الأجهزة أو إعادة التعبئة بعد إشعار العميل كتابيًا؛ وعند انطباق ذلك تُطبق أسعار تمديد المدة وفق البند 22 وتكاليف إعادة التعبئة وفق البند 26.",
  "تُقدم شهادات معايرة أجهزة شركة سماء الميدان عند الطلب، على أن تكون سارية وقت الاستخدام. وتكون جميع أجهزة الاختبار معايرة لدى جهة معايرة معتمدة.",
  "تُنفذ جميع أنشطة الاختبارات والتشغيل وفق معايير IEC وIEEE ومعايير أرامكو السعودية أو الشركة السعودية للكهرباء المنطبقة على نطاق المشروع.",
  "لا يشمل هذا النطاق أي إعادة اختبار أو استبدال أو تركيب أو تعديل لا ينتج عن خطأ أو تقصير من شركة سماء الميدان. وتُعد إعادة الاختبار الناتجة عن عدم حضور العميل أو الاستشاري، أو تغيير إعدادات المرحلات أو الرسومات المعتمدة، أو تعديل التوصيلات بواسطة الغير، أو عيوب المعدات أو المورد، أو طلب العميل أو العميل النهائي إعادة اختبار سبق إنجازه، أعمالًا إضافية تخضع لأمر تغيير كتابي وفق البند 20.",
  "لا يشمل هذا العرض توريد أو شراء أي مواد أو معدات.",
  "تخص الأسعار نطاق العمل المدرج في هذا العرض فقط. وأي تغيير أو إضافة أو تخفيض في النطاق أو الكميات أو المواصفات يخضع لتسعير وتقييم زمني منفصلين، ويتطلب أمر تغيير كتابيًا قبل التنفيذ.",
  "لا تخضع الأسعار الإجمالية المقطوعة لأي خصم إذا أُنجز العمل قبل المدة التقديرية، وتظل مستحقة بالكامل بصرف النظر عن نسبة الإنجاز المحققة عند نهاية مدة العمل المتفق عليها، بشرط ألا يكون عدم الإنجاز ناتجًا عن أسباب تُنسب إلى شركة سماء الميدان.",
  "إذا امتد العمل إلى ما بعد المدة المتفق عليها لأسباب لا تُنسب إلى شركة سماء الميدان، فتُحتسب الخدمات الإضافية بالسعر اليومي أو الشهري المبين في العرض التجاري.",
  "إذا تم تعليق المشروع أو إيقافه لأكثر من شهرين متصلين لأسباب لا تُنسب إلى شركة سماء الميدان، فيجوز إغلاق العقد وفق نسبة الإنجاز الفعلية، وتُعاد تسعير الأنشطة المتبقية بالأسعار السارية حينها.",
  "يلتزم العميل أو المقاول الرئيسي طوال مدة الأعمال بتوفير الدخول الآمن للموقع، ومصادر التيار المتردد والمستمر المطلوبة، ومكتب مناسب ومكان آمن لحفظ الأجهزة والملفات، ودورات مياه بحد أدنى دورة واحدة لكل خمسة مهندسين، وخدمة الإنترنت والهاتف ومياه الشرب ومواقف السيارات لفريق شركة سماء الميدان. كما يلتزم بتوفير السقالات والرافعات الشخصية والرافعات وترتيبات الرفع ومنصات الوصول المؤقتة وأي تجهيزات خاصة لازمة للتنفيذ الآمن لأنشطة الاختبار، ما لم تكن مشمولة صراحةً في هذا العرض.",
  "يلتزم العميل أو المقاول الرئيسي بتوفير فني مساعد مؤهل لكل مهندس اختبارات من شركة سماء الميدان، وفنيين اثنين لكل مهندس اختبارات محولات، على أن تكون لديهم خبرة ذات صلة بمحطات الكهرباء. ويخضع جميع أفراد الدعم المقترحين للمقابلة والاعتماد من قائد فريق شركة سماء الميدان.",
  "تكون تكاليف التعبئة وسحب الموارد مشمولة وفق ما هو مبين في هذا العرض. وتُحتسب كتكلفة إضافية أي رحلة تعبئة وعودة أخرى بعد السحب الأول، بما في ذلك دعم التشغيل أو أي حضور إضافي للموقع، وذلك بالسعر المتفق عليه لكل شخص لكل رحلة ذهاب وعودة.",
  "وفق أنظمة المملكة العربية السعودية، يجب تعليق جميع أعمال الاختبارات الخارجية من الساعة 12:00 ظهرًا حتى الساعة 3:00 عصرًا خلال الفترة من 15 يونيو إلى 15 سبتمبر من كل عام.",
  "يلتزم مهندسو شركة سماء الميدان بمواعيد العطلات الرسمية المعتمدة في المملكة العربية السعودية.",
  "تُعد شركة سماء الميدان نماذج وإجراءات الاختبار وترسلها إلى العميل أو المقاول الرئيسي لرفعها إلى العميل النهائي للمراجعة والاعتماد قبل بدء الاختبارات.",
  "تقدم شركة سماء الميدان تقارير تقدم يومية وأسبوعية وشهرية وفق ما يتم الاتفاق عليه مع العميل. وفي حال حدوث أي تأخير، تُقدم خطة تعافٍ بصورة عاجلة.",
  "تُسلم تقارير اختبارات التشغيل إلى العميل خلال 7 أيام عمل من اكتمال كل اختبار، ويُسلم تقرير التشغيل النهائي خلال 7 أيام عمل من التشغيل النهائي.",
  "تقوم شركة سماء الميدان بتسجيل تعديلات مخططات كما نُفذ على نسخة تشغيل واحدة من الرسومات التي يوفرها المقاول الرئيسي في الموقع.",
  "يتولى المقاول الرئيسي ترتيب وتوفير جميع القرطاسية ونماذج الاختبار المطبوعة والأوراق الفارغة والملفات والفواصل والمواد الاستهلاكية اللازمة للتوثيق.",
  "لا تتحمل شركة سماء الميدان المسؤولية عن أي أضرار أو خسائر تبعية أو غير مباشرة أو خاصة، بما في ذلك على سبيل المثال لا الحصر فقدان الإيرادات أو الانتفاع أو الإنتاج أو تكاليف رأس المال أو التكاليف المرتبطة بتوقف العمليات.",
  "إذا ظهرت بعد سحب الموارد مشكلة مرتبطة بنطاق عمل شركة سماء الميدان المنجز، فتقوم الشركة بمعالجتها دون تكلفة إضافية إذا أُخطرت بها خلال 30 يومًا من تاريخ اكتمال العمل. وبعد هذه المدة تُعد أي معالجة عملًا جديدًا يُسعر بصورة منفصلة.",
  "لا تشمل أعمال شركة سماء الميدان تنظيف منطقة العمل أو أعمال النظافة العامة.",
  "لا يشمل هذا العرض تمثيل المصنع أو أدوات المصنع الخاصة أو البرامج أو معدات الدعم الخاصة بالمصنع الأصلي، ويتولى المقاول الرئيسي أو العميل ترتيبها ما لم ينص العرض صراحةً على خلاف ذلك.",
  "لا يشمل هذا العرض أعمال الهندسة أو التهيئة أو ضبط المعاملات أو إنشاء ملفات SCD أو CID لأجهزة الحماية الذكية، كما لا يشمل تكامل SAS أو SCADA أو هندسة الاتصالات أو نطاق الأمن السيبراني أو إعدادات الاتصالات، ما لم تُدرج صراحةً في نطاق العمل.",
  "يلتزم المقاول الرئيسي أو المصنع بإعداد جميع المرحلات الرقمية ووحدات التحكم بالتهيئة الأساسية وجعلها جاهزة للاختبار قبل بدء أعمال شركة سماء الميدان.",
  "التزامًا بأخلاقيات العمل، لا يجوز للعميل أو المقاول الرئيسي توظيف أو استقطاب أو عرض العمل مباشرةً على أي مهندس أو موظف لدى شركة سماء الميدان لمدة سنتين من تاريخ اكتمال المشروع.",
  "لا يُقبل أي ضمان أداء أو تحميل عكسي للتكاليف ما لم تتم الموافقة عليه صراحةً وكتابيًا عند إصدار عرض السعر.",
  "يجب أن يشير أي أمر شراء أو أمر خدمة يصدر مقابل هذا العرض إلى رقم العرض، ويُعد صادرًا على أساس نطاق العمل والأسعار والشروط التجارية الواردة فيه. ولا تكون أي شروط إضافية أو متعارضة واردة في أمر الشراء ملزمة لشركة سماء الميدان ما لم تقبلها الشركة صراحةً وكتابيًا.",
  "يكون تشغيل قواطع الدائرة ومحركات معدات GIS مسؤولية ممثل المصنع وحده، وهو خارج نطاق هذا العرض.",
  "لا يشمل هذا العرض اختبار جهد الخطوة واللمس لنظام التأريض، أو تهيئة واختبار مسجل الأعطال، أو اختبار معاملات الخطوط الهوائية، أو اختبار محولات الوسائط، ما لم تُدرج صراحةً في نطاق العمل.",
  "لا يجوز السماح لأي مقاول باطن آخر بتنفيذ أعمال ضمن نطاق شركة سماء الميدان دون موافقة كتابية مسبقة من الشركة.",
  "يلتزم العميل أو المقاول الرئيسي بالتأكد قبل تعبئة موارد شركة سماء الميدان من اعتماد الإعدادات النهائية لمرحلات الحماية، وتوافر قائمة الإنذارات المعتمدة SPL، وتأكيد جميع مصادر التيار المتردد والمستمر المطلوبة وجاهزيتها."
];

const ENGINEER_RENTAL_CONDS_AR = [
  "الأسعار لا تشمل ضريبة القيمة المضافة بنسبة 15%، وتُضاف الضريبة وفق الأنظمة الضريبية السعودية السارية.",
  "يسري عرض السعر لمدة 30 يومًا من تاريخ إصداره، ويخضع لتأكيد توافر المهندس عند إصدار أمر الشراء.",
  "هذا العرض مخصص لتأجير مهندس على أساس شهر متصل، ولا يُعد تعاقدًا بالسعر اليومي.",
  "تبدأ مدة التأجير من تاريخ فتح تصريح LOA أو تصريح العمل للمهندس. وتُعد جميع الأيام التالية، بما فيها أيام التوقف أو الانتظار أو الاستعداد ما دام التصريح ساريًا، أيامًا مستحقة الدفع.",
  "تُحسب أي مدة إضافية بعد إتمام شهر واحد وحتى 15 يومًا تقويميًا وفق السعر اليومي المطبق. أما أي مدة إضافية تتجاوز 15 يومًا تقويميًا فتُعد شهرًا إضافيًا كاملًا وتُحتسب على هذا الأساس.",
  "يُحتسب أي يوم توقف أو انتظار أو تعطل بالموقع أو أي يوم يكون فيه المهندس متاحًا ولا يستطيع العمل لأسباب لا تُنسب إلى شركة سماء الميدان يومًا مستحق الدفع.",
  "تتولى شركة سماء الميدان ترتيب وتحمل تكاليف نقل وسكن المهندس المؤجر، ما لم ينص العرض التجاري على خلاف ذلك.",
  "يلتزم العميل بتوفير الدخول الآمن للموقع، وتصاريح العمل، وتصاريح الدخول، والتعريف بالموقع، ومتطلبات معدات الوقاية الشخصية، والرسومات والإعدادات المعتمدة، ومرافق العمل المناسبة، وجميع أعمال التنسيق اللازمة لأداء المهندس لمهامه.",
  "يؤدي المهندس الدور والنطاق المتفق عليهما في العرض فقط. وأي تغيير في الدور أو مستوى الصلاحية أو الموقع أو نظام الورديات أو نطاق العمل يتطلب موافقة كتابية مسبقة من شركة سماء الميدان، وقد يخضع لتسعير معدل.",
  "ساعات العمل القياسية هي 8 ساعات يوميًا ولمدة 6 أيام أسبوعيًا، وتخضع ساعات العمل في رمضان والعطلات الرسمية للأنظمة السعودية المطبقة.",
  "تُحتسب ساعات العمل الإضافية بعد ساعات العمل القياسية بمعدل 1.5 من سعر الساعة العادي، ويُحتسب العمل أيام الجمعة والعطلات الرسمية بمعدل ضعفي سعر الساعة العادي ما لم يُتفق على خلاف ذلك.",
  "يُعد كشف ساعات شهري ويُقدم إلى العميل للتوقيع، ويكون الكشف الموقع أساس إصدار الفاتورة، ويلتزم العميل بإعادته دون تأخير غير مبرر.",
  "تُصدر الفواتير شهريًا استنادًا إلى كشف الساعات الموقع، وتكون مستحقة السداد خلال 30 يومًا من تاريخ الفاتورة ما لم ينص العرض التجاري على شروط دفع مختلفة.",
  "إذا ظلت الفاتورة غير مسددة بعد 30 يومًا، فيجوز لشركة سماء الميدان إصدار متابعة رسمية للسداد. وإذا استمر عدم السداد لأكثر من 45 يومًا، فيجوز للشركة تعليق عمل المهندس أو سحبه بعد إشعار كتابي مسبق معقول.",
  "يتحمل العميل جميع رسوم التحويلات البنكية ورسوم تعديل الاعتماد المستندي، عند انطباقها.",
  "يجب أن يتضمن أمر شراء العميل جميع بيانات الفوترة وأن يشير إلى رقم عرض السعر هذا.",
  "يجوز لشركة سماء الميدان استبدال المهندس المعين بمهندس آخر مؤهل بصورة مناسبة عند الحاجة المعقولة، مع مراعاة متطلبات اعتماد المشروع المطبقة.",
  "يجوز لأي من الطرفين طلب سحب المهندس بعد توجيه إشعار كتابي معقول. وتظل الرسوم مستحقة حتى تاريخ السحب المؤكد، بما في ذلك أي رسوم مطبقة للأيام الإضافية أو الشهر الإضافي.",
  "يظل المهندس موظفًا لدى شركة سماء الميدان، ولا يجوز للعميل توظيفه أو استقطابه أو تشغيله مباشرةً أثناء المهمة ولمدة سنتين بعد اكتمالها دون موافقة كتابية مسبقة.",
  "لا تتحمل شركة سماء الميدان المسؤولية عن الخسائر غير المباشرة أو التبعية أو الخاصة، بما في ذلك فقدان الإنتاج أو الإيرادات أو الانتفاع أو تكاليف التأخير.",
  "تمنح التأخيرات أو قيود السفر أو الإجراءات الحكومية أو ظروف الموقع غير الآمنة أو أحداث القوة القاهرة الخارجة عن السيطرة المعقولة لشركة سماء الميدان الشركة تمديدًا معقولًا وتعويضًا عن التكاليف الإضافية الناتجة."
];

// Test engineer rental and equipment rental (added 2026-10-19). Arabic arrays mirror the English
// positions and are ordered by section, so the printed clause numbers run 1, 2, 3… (optional clauses that start unticked come last) Rental – LOA Holder keeps the id 'engineer_rental' so saved quotations open unchanged.
const TEST_ENGINEER_RENTAL_CONDS = [
  ["Prices are exclusive of 15% VAT, which will be added in accordance with the applicable Saudi tax regulations.","VAT",true],
  ["This quotation is valid for 30 days from the date of issue and is subject to confirmation of the engineer's availability at the time of Purchase Order issuance.","Validity",true],
  ["If an invoice remains unpaid after 30 days, Sky Field Company may issue a formal payment follow-up. If payment remains outstanding beyond 45 days, Sky Field Company may suspend or demobilize the engineer after reasonable prior written notice.","Payment – Late",true],
  ["All bank transfer charges and Letter of Credit amendment fees, where applicable, shall be borne by the Client.","Payment – Bank",true],
  ["The Client's Purchase Order must include complete invoicing details and must reference this quotation number.","Payment – PO",true],
  ["This quotation is for the rental of a qualified testing and commissioning engineer at the daily or monthly rate stated in the commercial offer. It is a manpower rental and not a lump-sum testing and commissioning project.","Rental Basis",true],
  ["The rental period shall start from the agreed mobilization date of the engineer and continue until the confirmed demobilization date. All days within this period, including idle, waiting, or standby days, shall be considered chargeable.","Rental Start",true],
  ["For monthly rentals, any additional period beyond one completed month, up to 15 calendar days, shall be calculated using the applicable daily rate. Any additional period exceeding 15 calendar days shall be charged as one full additional month.","Additional Days",true],
  ["Transportation and accommodation for the rental engineer shall be arranged and borne by Sky Field Company, unless otherwise stated in the commercial offer.","Accommodation",true],
  ["A monthly timesheet shall be prepared and submitted to the Client for signature. The signed timesheet will be the basis for invoicing and shall be returned without unreasonable delay.","Timesheet",true],
  ["Sky Field Company may replace the assigned engineer with another suitably qualified engineer when reasonably necessary, subject to applicable project approval requirements.","Replacement",true],
  ["The engineer shall perform the testing activities under the direction and supervision of the Client. The Client remains responsible for the overall testing program, test sequence, acceptance of results, and project completion.","Supervision",true],
  ["The Client shall provide safe site access, the permit holder (PTW/LOA receiver), isolations and shutdowns, work permits, gate passes, inductions, approved drawings, settings, and test formats, and all coordination required for the engineer to perform the assigned testing activities.","Client Responsibilities",true],
  ["The engineer shall perform only the agreed role and testing scope stated in the quotation. Any change in role, location, shift pattern, or scope requires Sky Field Company's prior written approval and may be subject to revised pricing.","Scope",true],
  ["Either party may request demobilization by giving reasonable written notice. Charges shall remain applicable through the engineer's confirmed demobilization date, including any applicable additional-day or monthly charge.","Demobilization",true],
  ["Standard working hours are 8 hours per day, 6 days per week. Ramadan working hours and official holidays shall follow applicable Saudi regulations.","Working Hours",true],
  ["Overtime beyond standard working hours shall be charged at 1.5 times the normal hourly rate. Work on Fridays and official public holidays shall be charged at 2 times the normal hourly rate, unless otherwise agreed.","Overtime",true],
  ["Any idle day, waiting day, site stoppage, or day during which the engineer is available but cannot work for reasons not attributable to Sky Field Company shall be counted as a chargeable day.","Idle Time",true],
  ["Delays, travel restrictions, government actions, unsafe site conditions, or force majeure events beyond Sky Field Company's reasonable control shall entitle Sky Field Company to a reasonable extension and reimbursement of resulting additional costs.","Force Majeure",true],
  ["Testing equipment is not included in this rental unless it is listed in the commercial offer. Any equipment required for the work shall be provided by the Client or quoted separately by Sky Field Company.","Testing Equipment",true],
  ["The engineer remains an employee of Sky Field Company. The Client shall not directly recruit, solicit, or employ the engineer during the assignment and for 2 years after completion without prior written agreement.","Non-Solicit",true],
  ["Sky Field Company shall not be liable for indirect, consequential, or special losses, including loss of production, revenue, use, or delay costs, nor for damage resulting from the Client's instructions, settings, drawings, or the condition of the equipment under test.","Liability",true]
];
const TEST_ENGINEER_RENTAL_CONDS_AR = [
  "الأسعار لا تشمل ضريبة القيمة المضافة بنسبة 15%، وتُضاف الضريبة وفق الأنظمة الضريبية السعودية السارية.",
  "يسري عرض السعر لمدة 30 يومًا من تاريخ إصداره، ويخضع لتأكيد توافر المهندس عند إصدار أمر الشراء.",
  "إذا ظلت الفاتورة غير مسددة بعد 30 يومًا، فيجوز لشركة سماء الميدان إصدار متابعة رسمية للسداد. وإذا استمر عدم السداد لأكثر من 45 يومًا، فيجوز للشركة تعليق عمل المهندس أو سحبه بعد إشعار كتابي مسبق معقول.",
  "يتحمل العميل جميع رسوم التحويلات البنكية ورسوم تعديل الاعتماد المستندي، عند انطباقها.",
  "يجب أن يتضمن أمر شراء العميل جميع بيانات الفوترة وأن يشير إلى رقم عرض السعر هذا.",
  "هذا العرض مخصص لتأجير مهندس اختبارات وتشغيل مؤهل بالسعر اليومي أو الشهري المحدد في العرض التجاري، وهو تأجير لكوادر فنية وليس مشروع اختبارات وتشغيل بسعر مقطوع.",
  "تبدأ مدة التأجير من تاريخ التعبئة المتفق عليه للمهندس وتستمر حتى تاريخ السحب المؤكد، وتُعد جميع الأيام خلال هذه المدة، بما فيها أيام التوقف أو الانتظار أو الاستعداد، أيامًا مستحقة الدفع.",
  "في حالة التأجير الشهري، تُحسب أي مدة إضافية بعد إتمام شهر واحد وحتى 15 يومًا تقويميًا وفق السعر اليومي المطبق، أما أي مدة إضافية تتجاوز 15 يومًا تقويميًا فتُحتسب شهرًا إضافيًا كاملًا.",
  "تتولى شركة سماء الميدان ترتيب وتحمل تكاليف نقل وسكن المهندس المؤجر، ما لم ينص العرض التجاري على خلاف ذلك.",
  "يُعد كشف ساعات شهري ويُقدم إلى العميل للتوقيع، ويكون الكشف الموقع أساس إصدار الفاتورة، ويلتزم العميل بإعادته دون تأخير غير مبرر.",
  "يجوز لشركة سماء الميدان استبدال المهندس المعين بمهندس آخر مؤهل بصورة مناسبة عند الحاجة المعقولة، مع مراعاة متطلبات اعتماد المشروع المطبقة.",
  "يؤدي المهندس أعمال الاختبار تحت توجيه العميل وإشرافه، ويظل العميل مسؤولًا عن برنامج الاختبارات وتسلسلها واعتماد النتائج وإنجاز المشروع.",
  "يلتزم العميل بتوفير الدخول الآمن للموقع، وحامل التصريح (مستلم تصريح العمل / LOA)، وأعمال العزل والفصل، وتصاريح العمل وتصاريح الدخول، والتعريف بالموقع، والرسومات والإعدادات ونماذج الاختبار المعتمدة، وجميع أعمال التنسيق اللازمة لأداء المهندس لأعمال الاختبار المكلف بها.",
  "يؤدي المهندس الدور ونطاق الاختبارات المتفق عليهما في العرض فقط. وأي تغيير في الدور أو الموقع أو نظام الورديات أو نطاق العمل يتطلب موافقة كتابية مسبقة من شركة سماء الميدان، وقد يخضع لتسعير معدل.",
  "يجوز لأي من الطرفين طلب سحب المهندس بعد توجيه إشعار كتابي معقول. وتظل الرسوم مستحقة حتى تاريخ السحب المؤكد، بما في ذلك أي رسوم مطبقة للأيام الإضافية أو الشهر الإضافي.",
  "ساعات العمل القياسية هي 8 ساعات يوميًا ولمدة 6 أيام أسبوعيًا، وتخضع ساعات العمل في رمضان والعطلات الرسمية للأنظمة السعودية المطبقة.",
  "تُحتسب ساعات العمل الإضافية بعد ساعات العمل القياسية بمعدل 1.5 من سعر الساعة العادي، ويُحتسب العمل أيام الجمعة والعطلات الرسمية بمعدل ضعفي سعر الساعة العادي ما لم يُتفق على خلاف ذلك.",
  "يُحتسب أي يوم توقف أو انتظار أو تعطل بالموقع أو أي يوم يكون فيه المهندس متاحًا ولا يستطيع العمل لأسباب لا تُنسب إلى شركة سماء الميدان يومًا مستحق الدفع.",
  "تمنح التأخيرات أو قيود السفر أو الإجراءات الحكومية أو ظروف الموقع غير الآمنة أو أحداث القوة القاهرة الخارجة عن السيطرة المعقولة لشركة سماء الميدان الشركة تمديدًا معقولًا وتعويضًا عن التكاليف الإضافية الناتجة.",
  "لا يشمل هذا التأجير أجهزة الاختبار ما لم تُذكر في العرض التجاري، ويتولى العميل توفير أي أجهزة لازمة للعمل أو تُسعّرها شركة سماء الميدان بشكل منفصل.",
  "يظل المهندس موظفًا لدى شركة سماء الميدان، ولا يجوز للعميل توظيفه أو استقطابه أو تشغيله مباشرةً أثناء المهمة ولمدة سنتين بعد اكتمالها دون موافقة كتابية مسبقة.",
  "لا تتحمل شركة سماء الميدان المسؤولية عن الخسائر غير المباشرة أو التبعية أو الخاصة، بما في ذلك فقدان الإنتاج أو الإيرادات أو الانتفاع أو تكاليف التأخير، ولا عن أي ضرر ناتج عن تعليمات العميل أو إعداداته أو رسوماته أو حالة المعدات محل الاختبار."
];
const EQUIPMENT_RENTAL_CONDS = [
  ["Prices are exclusive of 15% VAT, which will be added in accordance with the applicable Saudi tax regulations.","VAT",true],
  ["This quotation is valid for 30 days from the date of issue and is subject to confirmation of the equipment's availability at the time of Purchase Order issuance.","Validity",true],
  ["If an invoice remains unpaid after 30 days, Sky Field Company may issue a formal payment follow-up. If payment remains outstanding beyond 45 days, Sky Field Company may recall the equipment after reasonable prior written notice, and the Client shall allow its collection from site.","Payment – Late",true],
  ["All bank transfer charges and Letter of Credit amendment fees, where applicable, shall be borne by the Client.","Payment – Bank",true],
  ["The Client's Purchase Order must include complete invoicing details and must reference this quotation number.","Payment – PO",true],
  ["This quotation is for the rental of testing equipment only, at the daily, weekly, or monthly rate stated in the commercial offer. Operation of the equipment by a Sky Field Company engineer is not included unless stated in the commercial offer.","Equipment Rental Basis",true],
  ["The rental period shall start on the date the equipment is handed over to the Client or dispatched from Sky Field Company's premises, and shall end on the date it is returned to Sky Field Company's premises complete and in good condition. All days within this period, including Fridays, public holidays, and idle or standby days, shall be chargeable.","Rental Period",true],
  ["The minimum rental period is 7 calendar days unless otherwise stated in the commercial offer. For monthly rentals, any additional period beyond one completed month, up to 15 calendar days, shall be charged at the daily rate, and any additional period exceeding 15 calendar days shall be charged as one full additional month.","Minimum Rental",true],
  ["Transportation of the equipment to and from site, including loading and unloading, shall be at the Client's cost and responsibility unless included in the commercial offer.","Delivery & Collection",true],
  ["The equipment shall be handed over with a delivery note listing each item, its accessories, serial numbers, and condition, signed by both parties. On return, the equipment shall be checked against the same delivery note and shall be clean and complete with all accessories, cables, cases, and documents. Missing accessories shall be charged at their replacement cost.","Handover & Return",true],
  ["The equipment shall be supplied with valid calibration certificates. Any re-calibration required due to misuse, impact, or improper handling during the rental period shall be charged to the Client.","Calibration",true],
  ["The equipment shall be operated only by qualified and trained personnel, in accordance with the manufacturer's instructions and applicable safety procedures. Sky Field Company shall not be responsible for test results, settings, or any damage arising from operation of the equipment by the Client's personnel.","Qualified Operator",true],
  ["Any malfunction shall be reported to Sky Field Company in writing immediately. Sky Field Company shall repair or replace the faulty equipment as soon as reasonably practicable, and days during which the equipment is out of service due to a fault not caused by the Client shall not be charged.","Equipment Fault",true],
  ["The equipment remains the property of Sky Field Company. From handover until return, the Client shall be responsible for its safe use and storage and its protection against weather, dust, moisture, and theft, and shall not open, repair, modify, sub-rent, or move the equipment to another site without Sky Field Company's prior written approval; otherwise, Sky Field Company may recall the equipment.","Equipment Care",true],
  ["Any loss, theft, or damage to the equipment during the rental period, other than normal wear and tear, shall be charged to the Client at the cost of repair or the current replacement value, including calibration and transportation costs. Rental charges shall continue until the equipment is returned or its replacement value has been paid.","Damage & Loss",true],
  ["Sky Field Company shall not be liable for indirect, consequential, or special losses, including loss of production, revenue, use, or delay costs arising from equipment downtime. Sky Field Company's total liability under this rental shall not exceed the rental charges paid for the affected equipment.","Liability",true],
  ["Delays, travel restrictions, shipping or customs delays, government actions, or force majeure events beyond Sky Field Company's reasonable control shall entitle Sky Field Company to a reasonable extension of the delivery date.","Delays & Force Majeure",true],
  ["The Client shall insure the equipment against loss and damage for its full replacement value for the entire rental period.","Insurance",false],
  ["Sky Field Company may require a refundable security deposit, as stated in the commercial offer, before dispatching the equipment. The deposit shall be refunded after the equipment is returned complete and in good condition, less any amounts due.","Security Deposit",false]
];
const EQUIPMENT_RENTAL_CONDS_AR = [
  "الأسعار لا تشمل ضريبة القيمة المضافة بنسبة 15%، وتُضاف الضريبة وفق الأنظمة الضريبية السعودية السارية.",
  "يسري عرض السعر لمدة 30 يومًا من تاريخ إصداره، ويخضع لتأكيد توافر الأجهزة عند إصدار أمر الشراء.",
  "إذا ظلت الفاتورة غير مسددة بعد 30 يومًا، فيجوز لشركة سماء الميدان إصدار متابعة رسمية للسداد. وإذا استمر عدم السداد لأكثر من 45 يومًا، فيجوز للشركة استرداد الأجهزة بعد إشعار كتابي مسبق معقول، ويلتزم العميل بتمكينها من استلامها من الموقع.",
  "يتحمل العميل جميع رسوم التحويلات البنكية ورسوم تعديل الاعتماد المستندي، عند انطباقها.",
  "يجب أن يتضمن أمر شراء العميل جميع بيانات الفوترة وأن يشير إلى رقم عرض السعر هذا.",
  "هذا العرض مخصص لتأجير أجهزة الاختبار فقط بالسعر اليومي أو الأسبوعي أو الشهري المحدد في العرض التجاري، ولا يشمل تشغيل الأجهزة بواسطة مهندس من شركة سماء الميدان ما لم يُذكر ذلك في العرض التجاري.",
  "تبدأ مدة التأجير من تاريخ تسليم الأجهزة للعميل أو شحنها من مقر شركة سماء الميدان، وتنتهي بتاريخ إعادتها إلى مقر الشركة كاملة وبحالة جيدة. وتُعد جميع الأيام خلال هذه المدة، بما فيها أيام الجمعة والعطلات الرسمية وأيام التوقف أو الانتظار، أيامًا مستحقة الدفع.",
  "الحد الأدنى لمدة التأجير 7 أيام تقويمية ما لم ينص العرض التجاري على خلاف ذلك. وفي حالة التأجير الشهري، تُحسب أي مدة إضافية بعد إتمام شهر واحد وحتى 15 يومًا تقويميًا وفق السعر اليومي، وتُحتسب أي مدة إضافية تتجاوز 15 يومًا تقويميًا شهرًا إضافيًا كاملًا.",
  "يتحمل العميل تكاليف ومسؤولية نقل الأجهزة إلى الموقع ومنه، بما في ذلك التحميل والتنزيل، ما لم يكن النقل مشمولًا في العرض التجاري.",
  "تُسلَّم الأجهزة بموجب محضر تسليم يبين كل جهاز وملحقاته وأرقامه التسلسلية وحالته، ويوقعه الطرفان. وعند الإعادة تُطابق الأجهزة مع محضر التسليم نفسه، وتُعاد نظيفة وكاملة بجميع الملحقات والكابلات والحقائب والمستندات، ويُحتسب أي ملحق مفقود بتكلفة استبداله.",
  "تُورَّد الأجهزة بشهادات معايرة سارية، ويتحمل العميل تكلفة أي إعادة معايرة تلزم بسبب سوء الاستخدام أو الصدمات أو المناولة غير السليمة خلال مدة التأجير.",
  "لا تُشغَّل الأجهزة إلا بواسطة أفراد مؤهلين ومدربين وفق تعليمات الشركة المصنعة وإجراءات السلامة المطبقة، ولا تتحمل شركة سماء الميدان المسؤولية عن نتائج الاختبارات أو الإعدادات أو أي ضرر ناتج عن تشغيل الأجهزة بواسطة أفراد العميل.",
  "يُبلَّغ عن أي عطل كتابيًا لشركة سماء الميدان فور حدوثه، وتتولى الشركة إصلاح الجهاز المعطل أو استبداله في أقرب وقت ممكن عمليًا، ولا تُحتسب الأيام التي يكون فيها الجهاز خارج الخدمة بسبب عطل لا يُنسب إلى العميل.",
  "تظل الأجهزة ملكًا لشركة سماء الميدان. ويكون العميل مسؤولًا من تاريخ التسليم حتى الإعادة عن استخدامها وتخزينها بشكل آمن وحمايتها من الأحوال الجوية والغبار والرطوبة والسرقة، ولا يجوز له فتحها أو إصلاحها أو تعديلها أو تأجيرها للغير أو نقلها إلى موقع آخر دون موافقة كتابية مسبقة من الشركة، وإلا جاز للشركة استرداد الأجهزة.",
  "يتحمل العميل تكلفة أي فقد أو سرقة أو تلف يلحق بالأجهزة خلال مدة التأجير، عدا الاستهلاك العادي، بقيمة الإصلاح أو قيمة الاستبدال الحالية، بما في ذلك تكاليف المعايرة والنقل. وتستمر رسوم التأجير حتى إعادة الأجهزة أو سداد قيمة استبدالها.",
  "لا تتحمل شركة سماء الميدان المسؤولية عن الخسائر غير المباشرة أو التبعية أو الخاصة، بما في ذلك فقدان الإنتاج أو الإيرادات أو الانتفاع أو تكاليف التأخير الناتجة عن توقف الأجهزة، ولا تتجاوز مسؤوليتها الإجمالية بموجب هذا التأجير رسوم التأجير المدفوعة عن الجهاز المعني.",
  "تمنح التأخيرات أو قيود السفر أو تأخيرات الشحن والجمارك أو الإجراءات الحكومية أو أحداث القوة القاهرة الخارجة عن السيطرة المعقولة لشركة سماء الميدان الشركة تمديدًا معقولًا لموعد التسليم.",
  "يلتزم العميل بالتأمين على الأجهزة ضد الفقد والتلف بكامل قيمة استبدالها طوال مدة التأجير.",
  "يجوز لشركة سماء الميدان طلب تأمين نقدي مسترد، وفق ما ينص عليه العرض التجاري، قبل شحن الأجهزة. ويُرد التأمين بعد إعادة الأجهزة كاملة وبحالة جيدة، بعد خصم أي مبالغ مستحقة."
];
const QUOTATION_CONDITION_TYPES = {
  testing:{conds:TESTING_CONDS,ar:TESTING_CONDS_AR,durationSection:'Scope & Responsibilities'},
  engineer_rental:{conds:ENGINEER_RENTAL_CONDS,ar:ENGINEER_RENTAL_CONDS_AR,durationSection:'Rental Basis',engineerRental:true},
  test_engineer_rental:{conds:TEST_ENGINEER_RENTAL_CONDS,ar:TEST_ENGINEER_RENTAL_CONDS_AR,durationSection:'Rental Basis',engineerRental:true},
  equipment_rental:{conds:EQUIPMENT_RENTAL_CONDS,ar:EQUIPMENT_RENTAL_CONDS_AR,durationSection:'Equipment Rental Basis'}
};

const DEFAULT_CONDS = TESTING_CONDS;

const COND_SECTION_ORDER = ['Commercial & Payment','Rental Basis','Equipment Rental Basis','Scope & Responsibilities','Site Readiness & Mobilization','Working Hours & Schedule','Equipment, Standards & Reporting','Equipment Care & Liability','Exclusions','Liability & General'];
const COND_SECTION_AR = {
  'Commercial & Payment':'الشروط التجارية والدفع','Rental Basis':'أساس تأجير المهندس','Scope & Responsibilities':'النطاق والمسؤوليات',
  'Site Readiness & Mobilization':'جاهزية الموقع والتعبئة','Working Hours & Schedule':'ساعات العمل والبرنامج',
  'Equipment, Standards & Reporting':'الأجهزة والمعايير والتقارير','Exclusions':'الاستثناءات','Liability & General':'المسؤولية والشروط العامة',
  'Equipment Rental Basis':'أساس تأجير الأجهزة','Equipment Care & Liability':'العناية بالأجهزة والمسؤولية عنها'
};
const COND_CATEGORY_AR = {
  'Payment':'الدفع','Payment – Selected':'شروط الدفع المختارة','Payment – Late':'تأخر السداد','Payment – Bank':'الرسوم البنكية','Payment – PO':'أمر الشراء','VAT':'ضريبة القيمة المضافة','Validity':'صلاحية العرض',
  'Rental Basis':'أساس التأجير','LOA Start Date':'تاريخ بدء LOA','Additional Days':'الأيام الإضافية','Accommodation':'السكن والنقل','Timesheet':'كشف الساعات','Replacement':'الاستبدال',
  'Scope':'نطاق العمل','Client Responsibilities':'مسؤوليات العميل','Site Readiness':'جاهزية الموقع','Exclusions – Permits':'استثناءات التصاريح','Mobilization':'التعبئة','Demobilization':'سحب الموارد',
  'Working Hours':'ساعات العمل','Overtime':'العمل الإضافي','Idle Time':'التوقف والانتظار','Force Majeure':'القوة القاهرة','Calibration':'المعايرة','Standards':'المعايير','Repetition':'إعادة الاختبارات',
  'Exclusions – Material':'استثناء المواد','Liability':'المسؤولية','Non-Solicit':'عدم الاستقطاب','Custom':'شرط مخصص',
  'Rental Start':'بدء مدة التأجير','Supervision':'الإشراف','Testing Equipment':'أجهزة الاختبار',
  'Equipment Rental Basis':'أساس تأجير الأجهزة','Rental Period':'مدة التأجير','Minimum Rental':'الحد الأدنى للتأجير','Delivery & Collection':'النقل',
  'Handover & Return':'التسليم والإعادة','Qualified Operator':'التشغيل بأفراد مؤهلين','Equipment Fault':'أعطال الأجهزة','Equipment Care':'العناية بالأجهزة',
  'Damage & Loss':'التلف والفقد','Insurance':'التأمين على الأجهزة','Security Deposit':'التأمين النقدي','Delays & Force Majeure':'التأخير والقوة القاهرة'
};
const CAT_SECTION = {
  'Payment':'Commercial & Payment','Payment – Selected':'Commercial & Payment','Payment – Late':'Commercial & Payment','Payment – Bank':'Commercial & Payment','Payment – PO':'Commercial & Payment','VAT':'Commercial & Payment','Validity':'Commercial & Payment',
  'Rental Basis':'Rental Basis','LOA Start Date':'Rental Basis','Additional Days':'Rental Basis','Accommodation':'Rental Basis','Timesheet':'Rental Basis','Replacement':'Rental Basis',
  'Scope':'Scope & Responsibilities','Client Responsibilities':'Scope & Responsibilities',
  'Site Readiness':'Site Readiness & Mobilization','Exclusions – Permits':'Site Readiness & Mobilization','Mobilization':'Site Readiness & Mobilization','Demobilization':'Site Readiness & Mobilization',
  'Working Hours':'Working Hours & Schedule','Overtime':'Working Hours & Schedule','Idle Time':'Working Hours & Schedule','Force Majeure':'Working Hours & Schedule',
  'Equipment':'Equipment, Standards & Reporting','Calibration':'Equipment, Standards & Reporting','Standards':'Equipment, Standards & Reporting','Reporting':'Equipment, Standards & Reporting',
  'Repetition':'Exclusions','Exclusions – Material':'Exclusions',
  'Liability':'Liability & General','Non-Solicit':'Liability & General',
  'Rental Start':'Rental Basis','Supervision':'Scope & Responsibilities','Testing Equipment':'Equipment, Standards & Reporting',
  'Equipment Rental Basis':'Equipment Rental Basis','Rental Period':'Equipment Rental Basis','Minimum Rental':'Equipment Rental Basis','Delivery & Collection':'Equipment Rental Basis','Handover & Return':'Equipment Rental Basis',
  'Qualified Operator':'Equipment, Standards & Reporting','Equipment Fault':'Equipment, Standards & Reporting',
  'Equipment Care':'Equipment Care & Liability','Damage & Loss':'Equipment Care & Liability',
  'Delays & Force Majeure':'Liability & General','Insurance':'Liability & General','Security Deposit':'Liability & General'
};

let activeCat = Object.keys(ACTS)[0];
let selActs = {}, selEq = {}, actQty = {}, eqQty = {};
const SF_SCOPE_ACTIVITY_KEY_PREFIX='sfScopeActivityItem_';
let editingScopeActivityId='';
// Equipment list: equipment-library.js (managed in the Equipment Library page).
let conditionType = 'testing';
// Customer quotation text is always English-first. Arabic is optional and,
// when enabled, is added to the header, fixed labels, and every condition.
let conditionLanguage = 'en';
let paymentMethod = 'bank_transfer';
let lcApplicable = false;
let lcAdvancePct = 30;
let lcType = 'irrevocable_at_sight';
let lcAdvanceDays = 7;
let lcOpenDays = 10;
let lcDocumentDays = 14;
let lcPaymentBasis = 'monthly_progress';
let lcCurrency = 'SAR';
let lcCalculationBasis = 'before_vat';
let lcBeneficiary = 'Sky Field Company Limited';
let lcBankCharges = 'shared';
let lcRules = 'UCP 600';
let lcAcceptableBank = '';
let lcValidityDays = 30;
let lcDocuments = {commercial_invoice:true,delivery_note:true,progress_certificate:true,timesheet:false};
let paymentConditionOverrideEn = '';
let paymentConditionOverrideAr = '';
let conditionEditorIndex = -1;
let conditionEditorMode = 'edit';
let conditionEditorSection = '';
let conds = TESTING_CONDS.map(([t,c,e],i)=>({text:t,textAr:TESTING_CONDS_AR[i]||'',cat:c,enabled:e}));
let projectDuration = ''; // e.g. "6 months" — set via the Conditions tab and reflected automatically in the contract conditions
let paymentTermType = 'advance_balance';
let paymentAdvancePct = 30;
let paymentDueDays = 30;
let paymentBalanceBasis = 'monthly_progress';
let paymentCustomText = '';
let paymentCustomTextAr = '';
conds = conditionTemplate('testing');
let customSOW = []; // manually typed scope-of-work items: {id,text,qty,unit,hours}
let customSOWLabel = ''; // optional description shown instead of "Custom / Manual Entry"
let sowSeq = 1;
let quoteAttachments = [];
const GENERAL_CATEGORY_AR={
  'General – Variation':'عام – أوامر التغيير','General – Lump Sum':'عام – السعر المقطوع','General – Extension Rates':'عام – أسعار تمديد المدة',
  'General – Suspension':'عام – تعليق المشروع','General – Facilities':'عام – مرافق الموقع','General – Assistants':'عام – الفنيون المساعدون',
  'General – Mobilization & Demobilization':'عام – التعبئة وسحب الموارد','General – Outdoor Work':'عام – العمل الخارجي','General – Public Holidays':'عام – العطلات الرسمية',
  'General – Test Formats':'عام – نماذج الاختبار','General – Progress Reporting':'عام – تقارير التقدم','General – Report Submission':'عام – تسليم التقارير',
  'General – As-Built':'عام – مخططات كما نُفذ','General – Documentation':'عام – التوثيق','General – Rectification':'عام – معالجة الملاحظات',
  'General – Housekeeping':'عام – نظافة الموقع','General – OEM Exclusions':'عام – استثناءات المصنع','General – Engineering Exclusions':'عام – الاستثناءات الهندسية',
  'General – Relay Readiness':'عام – جاهزية المرحلات','General – Bond':'عام – الضمانات والتحميل العكسي','General – PO Reference':'عام – مرجعية أمر الشراء',
  'General – GIS Operation':'عام – تشغيل GIS','General – Special Tests':'عام – الاختبارات الخاصة','General – Other Subcontractors':'عام – مقاولو الباطن الآخرون',
  'General – Protection Readiness':'عام – جاهزية أنظمة الحماية'
};

const sfReservedDocumentNumbers=new Set();

const APP_PAGE_META = {
  dashboard: ['Dashboard','Business overview, projects, quotations, and invoice status.'],
  activities: ['New Quotation','Step 1 of 4 — define the scope of work and commercial details.'],
  equipment: ['New Quotation','Step 2 of 4 — select testing equipment and rental duration.'],
  costplanning: ['New Quotation','Step 3 of 4 — prepare the private manpower, equipment and other cost estimate.'],
  conditions: ['New Quotation','Step 4 of 4 — review commercial and technical conditions.'],
  projects: ['Projects','Track contract value, invoices, receipts, documents, and commission.'],
  projectdetails: ['Project Details','Complete project workspace: finance, invoices, engineers, payroll, expenses, and documents.'],
  quotes: ['Quotations','Review saved offers and convert approved quotations into projects.'],
  proformas: ['Proforma Invoices','Create and track advance, progress-based, fixed, and full invoices.'],
  analytics: ['Analytics','Profitability, collection, monthly trend, and engineer utilisation.'],
  engineers: ['Engineers','Maintain engineer availability, LOA classification, payroll details, and internal rates.'],
  payroll: ['Payroll','Prepare monthly attendance, payroll, approvals, Excel export, and actual project cost.'],
  costsettings: ['Equipment Library','Devices and their prices per day, week and month, offered in quotations.']
};

// Interface language is independent from the customer-facing condition
// language. Exact English UI phrases are translated at runtime, including UI
// fragments created later by the dashboard/project renderers. Customer PDFs
// are deliberately excluded and continue to follow conditionLanguage.
/* SF_UI_AR: i18n-ar.js */

let sfUiLanguage='en';
let sfUiObserver=null;
let sfUiMutationGuard=false;
const sfUiOriginalText=new WeakMap();
const sfUiOriginalAttrs=new WeakMap();
const SF_UI_EXCLUDE_SELECTOR='.sf-language-switcher,#preview-doc,.pi-page,script,style';

const SF_COMPANY_CONDITION_DEFAULTS_KEY='sfCompanyConditionDefaultsV1';

const SF_EN_NUMBER_WORDS={0:'zero',1:'one',2:'two',3:'three',4:'four',5:'five',6:'six',7:'seven',8:'eight',9:'nine',10:'ten',11:'eleven',12:'twelve',13:'thirteen',14:'fourteen',15:'fifteen',16:'sixteen',17:'seventeen',18:'eighteen',19:'nineteen',20:'twenty',21:'twenty-one',30:'thirty'};
const SF_AR_NUMBER_WORDS={0:'صفر',1:'واحد',2:'اثنان',3:'ثلاثة',4:'أربعة',5:'خمسة',6:'ستة',7:'سبعة',8:'ثمانية',9:'تسعة',10:'عشرة',11:'أحد عشر',12:'اثنا عشر',13:'ثلاثة عشر',14:'أربعة عشر',15:'خمسة عشر',16:'ستة عشر',17:'سبعة عشر',18:'ثمانية عشر',19:'تسعة عشر',20:'عشرون',21:'واحد وعشرون',30:'ثلاثون'};

let activeExportDocType='quotation';
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&document.getElementById('export-preview')?.style.display==='block')closeExport();
});

// ══════════════════════════════════════════════════════════════════════════════
// SAVED QUOTATIONS / INVOICE QUOTATIONS MODULE
// ══════════════════════════════════════════════════════════════════════════════
let savedQuotes = JSON.parse(localStorage.getItem('sfSavedQuotations')||'[]');
let activeQuoteId = '';

// Separate Proforma Invoice storage. Legacy records with type="invoice" remain readable in savedQuotes.
let proformaInvoices = JSON.parse(localStorage.getItem('sfProformaInvoices')||'[]');
let activeProformaId = '';
let piWorkingSource = null;
let pendingProgressValues = null; // one-shot pre-fill for progress % inputs when editing a saved record
const DEFAULT_PROFORMA_COMPANY = {
  nameEn:'SKY FIELD COMPANY LIMITED',
  nameAr:'شركة سماء الميدان المحدودة',
  vat:'310049492300003',
  addressEn:'Al-Dawadmi, Hittin District, Prince Mashhoor Bin Abdulaziz Street, Saudi Arabia',
  addressAr:'الدوادمي - حي حطين - شارع الأمير مشهور بن عبدالعزيز - المملكة العربية السعودية',
  telephone:'+966 55 742 4134',
  fax:'+966 16 383 6005'
};
let proformaCompanySettings = Object.assign({}, DEFAULT_PROFORMA_COMPANY, JSON.parse(localStorage.getItem('sfProformaCompanySettings')||'{}'));
let proformaSignature = localStorage.getItem('sfProformaSignature')||'';
let proformaStamp = localStorage.getItem('sfProformaStamp')||'';


// ══════════════════════════════════════════════════════════════════════════════
// ENGINEERS & SIMPLIFIED INTERNAL COSTING v10
// ══════════════════════════════════════════════════════════════════════════════
let sfEngineers = JSON.parse(localStorage.getItem('sfEngineers')||'[]');
let sfDeletedDefaultEngineerIds = new Set(JSON.parse(localStorage.getItem('sfDeletedDefaultEngineerIds')||'[]'));
// Private engineer identities, iqama numbers, salaries, rates and allowances
// must never be embedded in a static website file. Existing engineer records
// remain in the protected Supabase workspace and are available to admins only.
const SKYFIELD_DEFAULT_ENGINEERS = [];

let sfCostEquipment = JSON.parse(localStorage.getItem('sfCostEquipment')||'[]');

let sfCurrentCostPlan = {manpower:[],equipment:[],other:[]};
let sfCostSeq=1;


// ══════════════════════════════════════════════════════════════════════════════
// MONTHLY TIMESHEETS & PAYROLL v11
// ══════════════════════════════════════════════════════════════════════════════
let sfPayrollSheets = JSON.parse(localStorage.getItem('sfPayrollSheets')||'[]');
let sfCurrentPayroll = null;

// Extend quotation snapshots without changing the customer document structure.
const sfCollectQuotationSnapshotBase=collectQuotationSnapshot;
collectQuotationSnapshot=function(type){const s=sfCollectQuotationSnapshotBase(type);s.costPlan=deepClone(sfCurrentCostPlan);s.internalCostSummary=calcInternalCostPlan();return s;};
const sfApplyQuotationSnapshotBase=applyQuotationSnapshot;
applyQuotationSnapshot=function(snap){sfApplyQuotationSnapshotBase(snap);sfCurrentCostPlan=deepClone(snap?.costPlan||{manpower:[],equipment:[],other:[]});renderCostPlan();sfMarkQuoteClean();};
const sfClearAllBase=clearAll;
clearAll=function(){sfCurrentCostPlan={manpower:[],equipment:[],other:[]};sfClearAllBase();renderCostPlan();};
const sfRecalcBase=recalc;
recalc=function(){sfRecalcBase();renderCostPlan();};
const sfSetConditionTypeBase=setConditionType;
setConditionType=function(type,preserveCustom=false){sfSetConditionTypeBase(type,preserveCustom);renderCostPlan();};
const sfCalcQuotationTotalsBase=calcQuotationTotals;
calcQuotationTotals=function(){const t=sfCalcQuotationTotalsBase();const c=calcInternalCostPlan();t.internalCost=c.total;t.internalCostBreakdown=c;t.expectedProfit=(t.sub||0)-c.total;t.expectedMargin=(t.sub||0)?t.expectedProfit/t.sub*100:0;return t;};
const sfSyncProjectFromQuotationBase=syncProjectFromQuotation;
syncProjectFromQuotation=function(rec){const p=sfSyncProjectFromQuotationBase(rec);const plan=deepClone(rec?.snapshot?.costPlan||{manpower:[],equipment:[],other:[]});const sum=rec?.snapshot?.internalCostSummary||calcInternalCostPlan();p.costPlan=plan;p.estimatedInternalCost=sfNum(sum.total);p.expectedProfit=(parseFloat(rec?.snapshot?.totals?.sub)||0)-p.estimatedInternalCost;p.assignedEngineers=(plan.manpower||[]).filter(x=>x.engineerId).map(x=>({engineerId:x.engineerId,name:(sfEngineers.find(e=>e.id===x.engineerId)||{}).name||x.label||'',qty:sfNum(x.qty),duration:sfNum(x.duration),basis:x.basis,rate:sfNum(x.rate)}));saveProjects();return p;};


// v16 migration: split the legacy combined Site / Car Allowance field.
sfEngineers.forEach(e=>{if(e.carAllowance==null)e.carAllowance=sfNum(e.siteCar);if(e.siteAllowance==null)e.siteAllowance=0;});
sfPayrollSheets.forEach(sh=>(sh.rows||[]).forEach(r=>{if(r.carAllowance==null)r.carAllowance=sfNum(r.siteCar);if(r.siteAllowance==null)r.siteAllowance=0;}));
if(sfCurrentPayroll?.rows)(sfCurrentPayroll.rows||[]).forEach(r=>{if(r.carAllowance==null)r.carAllowance=sfNum(r.siteCar);if(r.siteAllowance==null)r.siteAllowance=0;});

// ── INIT ──────────────────────────────────────────────────────────────────────
document.getElementById('qdate').value=new Date().toISOString().slice(0,10);
importSkyFieldEngineers(false);
updatePaymentTermControls();buildCatList();buildTasks();buildEq();buildConds();buildCustomSOWList();renderQuoteAttachments();renderEngineers();renderCostLibrary();renderCostPlan();
generateNextQuoteNumber();
updateQuoteBadge();
let projects = JSON.parse(localStorage.getItem('sfProjects')||'[]').map(sfNormalizeProjectRecord);
let pmTempPOs=[], pmTempPays=[], pmTempDocs=[], pmTempComms=[];



// ══════════════════════════════════════════════════════════════════════════════
// PROJECT DETAILS WORKSPACE
// ══════════════════════════════════════════════════════════════════════════════
let sfActiveProjectDetailsId='';
let sfProjectDetailsPanel='overview';
const SF_EXPENSE_CATEGORY_LABELS={housing_invoice:'Housing invoice / فاتورة سكن',housing_allowance:'Housing allowance / بدل سكن',fuel:'Fuel / بنزين',transport:'Transport / انتقالات',extra:'Extra allowance / بدل إضافي',other:'Other / أخرى'};

// Proforma module initialization after quotations and projects have loaded.
projects.forEach(p=>{if(!Array.isArray(p.proformas))p.proformas=[];p.payments=(Array.isArray(p.payments)?p.payments:[]).map(sfNormalizePaymentRecord);if(!Array.isArray(p.docs))p.docs=[];if(!Array.isArray(p.actualExpenses))p.actualExpenses=[]});
// Repair older records so every existing invoice is represented in its project's payment ledger.
proformaInvoices.forEach(pi=>{if(pi.projectId&&projects.find(p=>p.id===pi.projectId))syncProformaToProject(pi);});
updateProformaBadge();
updateProformaAvailabilityControls();
renderProformas();

// ── UI initialization ──
if(!sfCurrentPayroll) sfCurrentPayroll=payrollBlankSheet();
sfInitInterfaceLanguage();
setupQuotationFieldGroups();
updateSidebarCounts();
window.addEventListener('online',()=>{
  if(sfCurrentUser){setCloudStatus('saving','Reconnecting securely…');sfCloudPullAll();}
});
window.addEventListener('offline',()=>setCloudStatus('offline','Offline — local cache'));
document.addEventListener('visibilitychange',async()=>{
  if(document.visibilityState!=='visible'||!sfDb||!sfCurrentUser)return;
  try{
    const {data,error}=await sfDb.auth.getSession();
    if(error)throw error;
    // Only refresh the session details: the page stays as it is (no redraw, no scroll to the top).
    // A real sign-out or a different user arrives through the auth listener, which does the full check.
    if(data?.session?.user?.id===sfCurrentUser?.id)sfCurrentUser=data.session.user;
  }catch(error){
    console.warn('Background session recheck failed; keeping the active local session.',error);
  }
});
setCloudStatus('saving','Checking secure session…');
const initialModule=localStorage.getItem('sfLastModule')||'dashboard';
setTimeout(()=>{
  const safe=['dashboard','activities','equipment','costplanning','conditions','projects','quotes','proformas','analytics','engineers','payroll','costsettings'].includes(initialModule)?initialModule:'dashboard';
  showTab(safe,document.querySelector(`.side-nav-btn[data-module="${['activities','equipment','costplanning','conditions'].includes(safe)?'activities':safe}"]`));
},0);

// Authentication is the final gate. The application remains hidden until a
// valid Supabase session is verified and the user's private data is hydrated.
// Auth starts after the unified modules have registered.

