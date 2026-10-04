import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'sw';

const en = {
  // roles & nav
  tenant: 'Tenant', owner: 'Owner', broker: 'Broker',
  explore: 'Explore', requests: 'My requests', profile: 'Profile', properties: 'Properties',
  inquiries: 'Inquiries', clients: 'Clients', listings: 'Listings', earnings: 'Earnings',
  // auth
  signIn: 'Sign in', signUp: 'Create account', signOut: 'Sign out', email: 'Email', password: 'Password',
  fullName: 'Full name', phone: 'Phone number', iAm: 'I am a…',
  roleTenantHint: 'Looking for a place to rent', roleOwnerHint: 'I rent out my house or apartment',
  roleBrokerHint: 'I bring clients and list homes for owners',
  noAccount: 'New to Kodi? Create an account', haveAccount: 'Already have an account? Sign in',
  browseGuest: 'Browse homes without an account', checkEmail: 'Check your email to confirm your account, then sign in.',
  tagline: 'Homes for rent in Dar es Salaam', passwordShort: 'Use at least 6 characters for your password.',
  notConfigured: 'The app is not connected to its database yet. Add your Supabase URL and key to the .env file (see README).',
  signInToContinue: 'Sign in to continue', signInPrompt: 'Sign in to request viewings, reserve homes and see your requests.',
  // explore
  any: 'Any', area: 'Area', type: 'Type', maxRent: 'Max rent', bedrooms: 'Bedrooms', homesFound: 'homes found',
  perMonth: '/ month', noResults: 'No homes match these filters. Try a wider area or budget.',
  apartment: 'Apartment', house: 'House', studio: 'Studio', room: 'Self-contained room',
  monthsAdvance: 'months advance', verified: 'Verified', viaBroker: 'Via broker', furnished: 'Furnished',
  bed: 'bed', bath: 'bath',
  // listing
  moveInCost: 'Move-in cost', monthlyRent: 'Monthly rent', advanceRequired: 'Advance required',
  reserveNow: 'Reserve now (1 month, credited to advance)', brokerFee: 'Broker fee', brokerFeeNone: 'None for tenants',
  whatsIncluded: "What's included", description: 'Description', listedBy: 'Owner', requestViewing: 'Request viewing',
  reserve: 'Reserve with mobile money', edit: 'Edit', notAvailable: 'This home is not available right now.',
  photos: 'Photos', noPhotos: 'No photos yet',
  // amenities
  am_water: 'Water tank', am_power: 'Backup power', am_guard: 'Security guard', am_parking: 'Parking',
  am_ac: 'Air conditioning', am_wifi: 'Wi-Fi ready', am_pool: 'Pool', am_garden: 'Garden', am_gate: 'Gated compound',
  // photo kinds
  ph_exterior: 'Outside', ph_living: 'Living room', ph_bedroom: 'Bedroom', ph_kitchen: 'Kitchen',
  ph_bathroom: 'Bathroom', ph_pool: 'Pool', ph_photo: 'Photo',
  // viewing / reserve
  yourName: 'Your name', preferredDate: 'Preferred day', brokerCode: 'Broker code (optional)',
  message: 'Message (optional)', sendRequest: 'Send request', requestSent: 'Request sent',
  requestSentBody: 'The owner will contact you to confirm the viewing.',
  invalidPhone: 'Enter a Tanzanian mobile number, for example 0712 345 678.', needName: 'Enter your name.',
  payWith: 'Pay with', pay: 'Pay', checkPhone: 'Check your phone',
  checkPhoneBody: 'A payment prompt was sent to {phone}. Enter your PIN to approve.', waiting: 'Waiting for confirmation…',
  paymentReceived: 'Payment received', paymentFailed: 'Payment did not go through',
  paymentFailedBody: 'Nothing was charged, or the prompt expired. You can try again.', tryAgain: 'Try again',
  receipt: 'Receipt', reference: 'Reference', amount: 'Amount', property: 'Property', done: 'Done',
  testMode: 'Test mode: no real money was taken.', timeout: 'No answer yet. Check My requests later for the result.',
  // requests
  viewing: 'Viewing', reservation: 'Reservation', st_open: 'Waiting', st_confirmed: 'Confirmed',
  st_declined: 'Declined', st_cancelled: 'Cancelled', cancel: 'Cancel request', noRequests: 'You have no requests yet. Find a home in Explore.',
  paid: 'Paid', pending: 'Pending', failed: 'Failed',
  // owner
  available: 'Available', occupied: 'Occupied', paused: 'Paused', openInquiries: 'Open inquiries',
  monthlyIncome: 'Monthly rent (occupied)', addProperty: 'Add property', noProperties: 'You have not listed a property yet.',
  direct: 'Direct', confirm: 'Confirm', decline: 'Decline', call: 'Call', whatsapp: 'WhatsApp', noInquiries: 'No inquiries yet.',
  // property form
  newProperty: 'New property', editProperty: 'Edit property', ownerName: "Owner's name", title: 'Title',
  titlePh: 'Bright 2-bedroom apartment', rentTsh: 'Monthly rent (TSh)', advanceMonths: 'Advance (months)',
  bathrooms: 'Bathrooms', amenities: 'Amenities', descriptionPh: 'Near the main road, prepaid LUKU meter, water every day.',
  status: 'Status', save: 'Save', saved: 'Saved', savedAddPhotos: 'Saved. Now add photos so tenants can see the home.',
  addFromGallery: 'Add from gallery', takePhoto: 'Take photo', uploading: 'Uploading…', photoTip: 'Clear daylight photos of every room get more viewing requests. Tap a photo to label it.',
  removePhoto: 'Remove this photo?', remove: 'Remove', deleteProperty: 'Delete property',
  deleteConfirm: 'Delete this property and its photos? This cannot be undone.', delete: 'Delete',
  labelPhoto: 'Which room is this?', needTitle: 'Add a title and rent.', cameraDenied: 'Allow camera access in Settings to take photos.',
  galleryDenied: 'Allow photo access in Settings to add photos.',
  // broker
  yourCode: 'Your broker code', codeHint: "Clients enter this code when they request a viewing or reserve. You earn one month's rent when they move in, paid by the owner.",
  shareCode: 'Share code', shareText: 'Find a home on Kodi and use my broker code {code} when you request a viewing.',
  earned: 'Earned', pendingCommission: 'Pending', activeClients: 'Active clients',
  st_lead: 'New lead', st_viewing: 'Viewing', st_agreed: 'Agreed', st_moved: 'Moved in', nextStage: 'Next stage',
  addClient: 'Add client', lookingFor: 'Looking for', lookingForPh: '2 bed, Sinza, up to TSh 600,000',
  linkProperty: 'Link to a property (optional)', none: 'None', clientExists: 'This client is already in your list.',
  noClients: 'No clients yet. Share your code or add a client.', commission: 'Commission', noCommissions: 'Commissions appear when a client agrees to rent.',
  // profile
  language: 'Language', role: 'Account type', saveProfile: 'Save changes', profileSaved: 'Profile saved',
  error: 'Something went wrong', cancelBtn: 'Cancel', makeCover: 'Use as cover photo',
};

type Dict = typeof en;
export type TKey = keyof Dict;

const sw: Dict = {
  tenant: 'Mpangaji', owner: 'Mwenye nyumba', broker: 'Dalali',
  explore: 'Tafuta', requests: 'Maombi yangu', profile: 'Wasifu', properties: 'Nyumba',
  inquiries: 'Maombi', clients: 'Wateja', listings: 'Matangazo', earnings: 'Mapato',
  signIn: 'Ingia', signUp: 'Fungua akaunti', signOut: 'Toka', email: 'Barua pepe', password: 'Nenosiri',
  fullName: 'Jina kamili', phone: 'Namba ya simu', iAm: 'Mimi ni…',
  roleTenantHint: 'Natafuta nyumba ya kupanga', roleOwnerHint: 'Napangisha nyumba au apartment yangu',
  roleBrokerHint: 'Ninaleta wateja na kuweka nyumba kwa niaba ya wamiliki',
  noAccount: 'Mgeni Kodi? Fungua akaunti', haveAccount: 'Una akaunti tayari? Ingia',
  browseGuest: 'Angalia nyumba bila akaunti', checkEmail: 'Angalia barua pepe yako kuthibitisha akaunti, kisha uingie.',
  tagline: 'Nyumba za kupanga Dar es Salaam', passwordShort: 'Tumia angalau herufi 6 kwa nenosiri.',
  notConfigured: 'Programu bado haijaunganishwa na hifadhidata. Weka URL na key ya Supabase kwenye faili .env (angalia README).',
  signInToContinue: 'Ingia kuendelea', signInPrompt: 'Ingia kuomba kuona nyumba, kuweka nafasi na kuona maombi yako.',
  any: 'Yoyote', area: 'Eneo', type: 'Aina', maxRent: 'Kodi ya juu', bedrooms: 'Vyumba', homesFound: 'nyumba zimepatikana',
  perMonth: '/ mwezi', noResults: 'Hakuna nyumba zinazolingana. Jaribu eneo au bajeti pana zaidi.',
  apartment: 'Apartment', house: 'Nyumba', studio: 'Studio', room: 'Chumba master',
  monthsAdvance: 'miezi ya mbele', verified: 'Imethibitishwa', viaBroker: 'Kupitia dalali', furnished: 'Ina samani',
  bed: 'chumba', bath: 'bafu',
  moveInCost: 'Gharama ya kuhamia', monthlyRent: 'Kodi kwa mwezi', advanceRequired: 'Kodi ya mbele',
  reserveNow: 'Weka nafasi sasa (mwezi 1, unahesabiwa kwenye kodi)', brokerFee: 'Ada ya dalali', brokerFeeNone: 'Hakuna kwa mpangaji',
  whatsIncluded: 'Vilivyopo', description: 'Maelezo', listedBy: 'Mmiliki', requestViewing: 'Omba kuona nyumba',
  reserve: 'Weka nafasi kwa simu', edit: 'Hariri', notAvailable: 'Nyumba hii haipatikani kwa sasa.',
  photos: 'Picha', noPhotos: 'Bado hakuna picha',
  am_water: 'Tanki la maji', am_power: 'Umeme wa akiba', am_guard: 'Mlinzi', am_parking: 'Maegesho',
  am_ac: 'AC', am_wifi: 'Wi-Fi', am_pool: 'Bwawa la kuogelea', am_garden: 'Bustani', am_gate: 'Uzio na geti',
  ph_exterior: 'Nje', ph_living: 'Sebule', ph_bedroom: 'Chumba cha kulala', ph_kitchen: 'Jiko',
  ph_bathroom: 'Bafu', ph_pool: 'Bwawa', ph_photo: 'Picha',
  yourName: 'Jina lako', preferredDate: 'Siku unayopendelea', brokerCode: 'Namba ya dalali (si lazima)',
  message: 'Ujumbe (si lazima)', sendRequest: 'Tuma ombi', requestSent: 'Ombi limetumwa',
  requestSentBody: 'Mwenye nyumba atakupigia kuthibitisha siku ya kuona.',
  invalidPhone: 'Weka namba ya simu ya Tanzania, mfano 0712 345 678.', needName: 'Weka jina lako.',
  payWith: 'Lipa kwa', pay: 'Lipa', checkPhone: 'Angalia simu yako',
  checkPhoneBody: 'Ombi la malipo limetumwa kwa {phone}. Weka PIN kuthibitisha.', waiting: 'Inasubiri uthibitisho…',
  paymentReceived: 'Malipo yamepokelewa', paymentFailed: 'Malipo hayajakamilika',
  paymentFailedBody: 'Hakuna kilichokatwa, au muda wa ombi umeisha. Unaweza kujaribu tena.', tryAgain: 'Jaribu tena',
  receipt: 'Risiti', reference: 'Kumbukumbu', amount: 'Kiasi', property: 'Nyumba', done: 'Sawa',
  testMode: 'Hali ya majaribio: hakuna pesa halisi iliyochukuliwa.', timeout: 'Bado hakuna jibu. Angalia Maombi yangu baadaye.',
  viewing: 'Kuona', reservation: 'Nafasi', st_open: 'Inasubiri', st_confirmed: 'Imethibitishwa',
  st_declined: 'Imekataliwa', st_cancelled: 'Imesitishwa', cancel: 'Sitisha ombi', noRequests: 'Bado huna maombi. Tafuta nyumba kwenye Tafuta.',
  paid: 'Imelipwa', pending: 'Inasubiri', failed: 'Imeshindikana',
  available: 'Wazi', occupied: 'Imepangishwa', paused: 'Imesimamishwa', openInquiries: 'Maombi wazi',
  monthlyIncome: 'Kodi kwa mwezi (zilizopangishwa)', addProperty: 'Ongeza nyumba', noProperties: 'Bado hujaweka nyumba.',
  direct: 'Moja kwa moja', confirm: 'Thibitisha', decline: 'Kataa', call: 'Piga simu', whatsapp: 'WhatsApp', noInquiries: 'Bado hakuna maombi.',
  newProperty: 'Nyumba mpya', editProperty: 'Hariri nyumba', ownerName: 'Jina la mmiliki', title: 'Jina la tangazo',
  titlePh: 'Apartment ya vyumba 2 yenye mwanga', rentTsh: 'Kodi kwa mwezi (TSh)', advanceMonths: 'Kodi ya mbele (miezi)',
  bathrooms: 'Mabafu', amenities: 'Huduma', descriptionPh: 'Karibu na barabara, mita ya LUKU, maji kila siku.',
  status: 'Hali', save: 'Hifadhi', saved: 'Imehifadhiwa', savedAddPhotos: 'Imehifadhiwa. Sasa ongeza picha ili wapangaji waone nyumba.',
  addFromGallery: 'Ongeza kutoka picha', takePhoto: 'Piga picha', uploading: 'Inapakia…', photoTip: 'Picha safi za mchana za kila chumba huleta maombi mengi. Gusa picha kuipa jina.',
  removePhoto: 'Ondoa picha hii?', remove: 'Ondoa', deleteProperty: 'Futa nyumba',
  deleteConfirm: 'Futa nyumba hii na picha zake? Haiwezi kurudishwa.', delete: 'Futa',
  labelPhoto: 'Hiki ni chumba gani?', needTitle: 'Weka jina la tangazo na kodi.', cameraDenied: 'Ruhusu kamera kwenye Settings kupiga picha.',
  galleryDenied: 'Ruhusu picha kwenye Settings kuongeza picha.',
  yourCode: 'Namba yako ya dalali', codeHint: 'Wateja huweka namba hii wanapoomba kuona au kuweka nafasi. Unapata kodi ya mwezi mmoja wanapohamia, inayolipwa na mwenye nyumba.',
  shareCode: 'Shiriki namba', shareText: 'Tafuta nyumba kwenye Kodi na utumie namba yangu ya dalali {code} unapoomba kuona.',
  earned: 'Umepata', pendingCommission: 'Inasubiri', activeClients: 'Wateja hai',
  st_lead: 'Mteja mpya', st_viewing: 'Kuona', st_agreed: 'Wamekubaliana', st_moved: 'Amehamia', nextStage: 'Hatua inayofuata',
  addClient: 'Ongeza mteja', lookingFor: 'Anatafuta', lookingForPh: 'Vyumba 2, Sinza, hadi TSh 600,000',
  linkProperty: 'Unganisha na nyumba (si lazima)', none: 'Hakuna', clientExists: 'Mteja huyu yupo tayari kwenye orodha yako.',
  noClients: 'Bado huna wateja. Shiriki namba yako au ongeza mteja.', commission: 'Kamisheni', noCommissions: 'Kamisheni zinaonekana mteja anapokubali kupanga.',
  language: 'Lugha', role: 'Aina ya akaunti', saveProfile: 'Hifadhi mabadiliko', profileSaved: 'Wasifu umehifadhiwa',
  error: 'Kuna tatizo', cancelBtn: 'Ghairi', makeCover: 'Weka kama picha kuu',
};

const dicts: Record<Lang, Dict> = { en, sw };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey, vars?: Record<string, string>) => string };
const LangContext = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (k) => en[k] });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    AsyncStorage.getItem('kodi.lang')
      .then((v) => {
        if (v === 'en' || v === 'sw') setLangState(v);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem('kodi.lang', l).catch(() => {});
  }, []);

  const t = useCallback(
    (k: TKey, vars?: Record<string, string>) => {
      let s = dicts[lang][k] ?? en[k] ?? String(k);
      if (vars) for (const [name, value] of Object.entries(vars)) s = s.replace(`{${name}}`, value);
      return s;
    },
    [lang],
  );

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useT = () => useContext(LangContext);
