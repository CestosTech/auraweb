import React, { useEffect, useState } from 'react';
import { BriefcaseBusiness, Hammer, MapPin, MessageCircle, Search, Share2, SlidersHorizontal, Star } from 'lucide-react';
import { command } from '../utils/commandApi';
import { usePlatform } from './context';
import { useRemote, friendly } from './hooks';
import { Row, imageOf, money } from './model';
import { auraShareUrl } from './share';
import { useSeo } from './seo';
import { Button, Dialog, Field, Notice, Photo, Select } from './ui';
import { MediaEditor } from './EditorFields';

const categories = ['Carpenter','Electrician','Plumber','Mechanic','Welder','Mason & Builder','Painter','Roofer','AC & Refrigeration','Appliance Repair','Cleaner','Barber & Hair Stylist','Tailor','Caterer','Photographer & Videographer','Tutor','Phone & Computer Repair','Generator Repair','Gardener & Landscaper','Mover & Haulage','Pest Control','Auto Body Repair'];
const places: Record<string,string[]> = { Bomi:['Tubmanburg','Klay','Dowein','Suehn Mecca','Senjeh'], Bong:['Gbarnga','Totota','Salala','Suakoko','Palala','Kokoyah'], Gbarpolu:['Bopolu','Gbarma','Belleh','Bokomu','Kongba'], 'Grand Bassa':['Buchanan','Compound Number 3','Edina','St. John River','Neekreen'], 'Grand Cape Mount':['Robertsport','Sinje','Tewor','Garwula','Bomi Hills'], 'Grand Gedeh':['Zwedru','Tchien','Konobo','B’hai'], 'Grand Kru':['Barclayville','Sasstown','Buah','Wlogba'], Lofa:['Voinjama','Zorzor','Foya','Kolahun','Salayea','Vahun'], Margibi:['Kakata','Harbel','Marshall','Mambah-Kaba','Cotton Tree'], Maryland:['Harper','Pleebo','Fish Town','Barrobo','Karloken'], Montserrado:['Monrovia','Sinkor','Paynesville','Congo Town','Gardnersville','New Georgia','Barnersville','Brewerville'], Nimba:['Ganta','Sanniquellie','Yekepa','Bensonville','Tappita','Saclepea','Gbehlay-Geh'], 'River Cess':['Cestos City','River Cess','Timbo','Zartlahn'], 'River Gee':['Fish Town','Gbeapo','Karforh','Chedepo'], Sinoe:['Greenville','Dugbe River','Juarzon','Kpayan','Plahn Nyarn'] };
const counties = Object.keys(places);
export function ServicesMarket() {
  const { requireLogin, openChat, toast } = usePlatform();
  const feed = useRemote<{items:Row[]}>('/v1/services', undefined, 0, false);
  const [query,setQuery] = useState(''), [category,setCategory] = useState(''), [county,setCounty] = useState(''), [locality,setLocality] = useState(''), [filters,setFilters] = useState(false), [profile,setProfile] = useState(false), [compose,setCompose] = useState(false), [selected,setSelected] = useState<Row|null>(null), [stars,setStars] = useState<Record<string,number>>({});
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('item');
    if (!id) return;
    const found = (feed.data?.items || []).find((i) => i.id === id);
    if (found) {
      setSelected(found);
      return;
    }
    if (feed.loading) return;
    let alive = true;
    void command(`/v1/services/${encodeURIComponent(id)}`, undefined, undefined, false)
      .then((r) => {
        if (alive && r?.item) setSelected(r.item);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [feed.data, feed.loading, location.search]);
  const rows = (feed.data?.items || []).filter(r => (!query || `${r.title} ${r.description} ${r.category} ${r.provider?.name} ${r.locality}`.toLowerCase().includes(query.toLowerCase())) && (!category || r.category===category) && (!county || r.county===county) && (!locality || r.locality===locality));
  const create = async () => { if (!(await requireLogin())) return; setProfile(true); };
  return <section className="a-page a-services-page">
    <div className="a-services-hero"><span className="a-services-kicker"><Hammer size={15}/> AURA SERVICES</span><h1>Good work, close by.</h1><p>Find trusted local people for the jobs that matter.</p><div className="a-services-search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search services or skills"/><button aria-label="Filters" onClick={()=>setFilters(true)}><SlidersHorizontal/></button></div><div className="a-services-chips">{categories.slice(0,10).map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(category===c?'':c)}>{c}</button>)}</div></div>
    <div className="a-services-heading"><div><h2>{rows.length} local services</h2><p>Skilled people and businesses around Liberia</p></div><Button onClick={()=>void create()}>Offer a service</Button></div>
    {feed.loading && <div className="a-empty">Finding local services…</div>}{feed.error && <Notice error={feed.error} retry={feed.reload}/>}
    {!feed.loading && !feed.error && rows.length===0 && <div className="a-services-empty"><BriefcaseBusiness/><h3>{(feed.data?.items||[]).length ? 'No services match those filters.' : 'Great local work starts here.'}</h3><p>{(feed.data?.items||[]).length ? 'Try a different skill or county.' : 'Create a work profile and help your neighbours find you.'}</p>{!(feed.data?.items||[]).length && <Button onClick={()=>void create()}>Create work profile</Button>}</div>}
    <div className="a-services-grid">{rows.map(item=><article className="a-service-card" key={item.id} onClick={()=>setSelected(item)}><div className="a-service-cover"><Photo src={item.image||item.images?.[0]||''} alt={item.title}/><span>{item.category}</span>{item.videoUrl&&<b>▶ Video</b>}</div><div className="a-service-content"><h3>{item.title}</h3><p className="a-service-desc">{item.description}</p><div className="a-service-provider"><Photo src={item.provider?.photoUrl||''} alt=""/><strong>{item.provider?.name||'Local provider'}</strong><span>{Number(item.reviewsCount)>0?<><Star size={15} fill="#edae25"/> {(Number(item.rating)||0).toFixed(1)} ({item.reviewsCount})</>:'New · No reviews'}</span></div><div className="a-service-bottom"><span><MapPin size={15}/>{item.locality}, {item.county}</span><strong>{money(Number(item.rateUsd)||0)}{item.pricingType==='hourly'?'/hr':' / job'}</strong></div></div></article>)}</div>
    {filters&&<Dialog title="Find the right help" onClose={()=>setFilters(false)}><div className="a-service-filter"><Select label="Service category" value={category} options={[{value:'',label:'All categories'},...categories.map(c=>({value:c,label:c}))]} onChange={setCategory}/><Select label="County" value={county} options={[{value:'',label:'All counties'},...counties.map(c=>({value:c,label:c}))]} onChange={v=>{setCounty(v);setLocality('')}}/>{county&&<Select label="Town or area" value={locality} options={[{value:'',label:'All places'},...(places[county]||[]).map(p=>({value:p,label:p}))]} onChange={setLocality}/>}<div className="a-row between"><Button secondary onClick={()=>{setCategory('');setCounty('');setLocality('')}}>Reset</Button><Button onClick={()=>setFilters(false)}>Show services</Button></div></div></Dialog>}
    {profile&&<WorkProfileEditor onClose={()=>setProfile(false)} onSaved={()=>{setProfile(false);setCompose(true)}}/>}
    {compose&&<ServiceEditor onClose={()=>setCompose(false)} onSaved={()=>{setCompose(false);feed.reload()}}/>}
    {selected&&<ServiceDetail item={selected} onClose={()=>{setSelected(null);if(new URLSearchParams(location.search).has('item')){const u=new URL(location.href);u.searchParams.delete('item');history.replaceState(null,'',u.pathname+u.search+u.hash);}}} onRate={async n=>{if(!(await requireLogin()))return;try{await command(`/v1/services/${selected.id}/rating`,{stars:n});setStars({...stars,[selected.id]:n});feed.reload();toast('Thanks for rating this provider.')}catch(e){toast(friendly(e))}}} onContact={()=>void openChat('service',selected.id)}/>}
  </section>;
}
function WorkProfileEditor({onClose,onSaved}:{onClose:()=>void;onSaved:()=>void}) {
  const remote=useRemote('/v1/work-profile/me'); const [name,setName]=useState(''),[description,setDescription]=useState(''),[selected,setSelected]=useState<string[]>([]),[hasBusiness,setHasBusiness]=useState(false),[businessName,setBusinessName]=useState(''),[county,setCounty]=useState(''),[locality,setLocality]=useState(''),[address,setAddress]=useState(''),[coords,setCoords]=useState<Row|null>(null),[photo,setPhoto]=useState<Row>({images:[]}),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const p=remote.data?.profile;if(!p)return;setName(p.name||'');setDescription(p.description||'');setSelected(p.categories||[]);setHasBusiness(!!p.hasBusiness);setBusinessName(p.businessName||'');setCounty(p.county||'');setLocality(p.locality||'');setAddress(p.businessAddress||'');setCoords(p.location||null);setPhoto({images:p.photoUrl?[p.photoUrl]:[]})},[remote.data]);
  const save=async()=>{setBusy(true);setError('');try{await command('/v1/work-profile/me',{name,description,categories:selected,hasBusiness,businessName,county,locality,businessAddress:address,location:coords});await command('/v1/work-profile/me/media',{images:photo.images||[],videoUrl:null,videoPosition:null});onSaved()}catch(e){setError(friendly(e))}finally{setBusy(false)}};
  const gps=()=>{if(!navigator.geolocation){setError('Location is not available in this browser.');return}navigator.geolocation.getCurrentPosition(p=>{const location={lat:p.coords.latitude,lng:p.coords.longitude,address,area:locality};setCoords(location);if(!address)setAddress(`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`)},()=>setError('Allow location access, or try again.'),{enableHighAccuracy:true,timeout:15000})};
  return <Dialog title="Create your work profile" onClose={onClose} wide><div className="a-service-form"><p>Help customers find the skills they need.</p><MediaEditor scope="/v1/services/profile" value={photo} onChange={setPhoto} imagesOnly/><Field label="Your name"><input value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></Field><fieldset><legend>Your skills (select up to 8)</legend><div className="a-service-picks">{categories.map(c=><button type="button" className={selected.includes(c)?'selected':''} key={c} onClick={()=>setSelected(a=>a.includes(c)?a.filter(x=>x!==c):a.length<8?[...a,c]:a)}><Hammer size={15}/>{c}</button>)}</div></fieldset><Field label="Short description"><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={500} rows={3}/></Field><label className="a-service-check"><input type="checkbox" checked={hasBusiness} onChange={e=>setHasBusiness(e.target.checked)}/> I have a business</label>{hasBusiness&&<><Field label="Business name"><input value={businessName} onChange={e=>setBusinessName(e.target.value)} maxLength={100}/></Field><Field label="Business address"><input value={address} onChange={e=>setAddress(e.target.value)} maxLength={240}/></Field><Button secondary onClick={gps}><MapPin size={16}/>{coords?'Update business GPS location':'Use current GPS location'}</Button>{coords&&<small className="a-muted">Location pinned · {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</small>}</>}<Select label="County" value={county} options={[{value:'',label:'Choose county'},...counties.map(c=>({value:c,label:c}))]} onChange={v=>{setCounty(v);setLocality('')}}/>{county&&<Select label="Town or area" value={locality} options={[{value:'',label:'Choose a place'},...(places[county]||[]).map(x=>({value:x,label:x}))]} onChange={setLocality}/>}<Notice error={error}/><Button onClick={()=>void save()} disabled={busy}>{busy?'Saving…':'Save work profile'}</Button><p className="a-muted">Create your profile first, then add service listings.</p></div></Dialog>;
}
function ServiceEditor({onClose,onSaved}:{onClose:()=>void;onSaved:()=>void}) {
  const profile=useRemote('/v1/work-profile/me');
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState(''),[pricingType,setPricingType]=useState('hourly'),[rate,setRate]=useState(''),[media,setMedia]=useState<Row>({images:[]}),[id,setId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const profileCategories: string[] = profile.data?.profile?.categories || [];
  const create=async()=>{setBusy(true);setError('');try{const r=await command('/v1/services',{title,description,category,pricingType,rateUsd:Number(rate),published:false});setId(r.item.id)}catch(e){setError(friendly(e))}finally{setBusy(false)}};
  const publish=async()=>{setBusy(true);setError('');try{await command(`/v1/services/${id}/media`,{...media});await command(`/v1/services/${id}`,{title,description,category,pricingType,rateUsd:Number(rate),published:true});onSaved()}catch(e){setError(friendly(e))}finally{setBusy(false)}};
  return <Dialog title="List a service" onClose={onClose} wide><div className="a-service-form"><Field label="Service title"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Home wiring and repairs" maxLength={100}/></Field><Select label="Category" value={category} options={[{value:'',label:'Choose your category'},...(profileCategories.length?profileCategories:categories).map(c=>({value:c,label:c}))]} onChange={setCategory}/><Field label="What is included?"><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={4} maxLength={800}/></Field><Select label="How do you charge?" value={pricingType} options={[{value:'hourly',label:'Per hour'},{value:'fixed',label:'Per job (fixed price)'}]} onChange={setPricingType}/><Field label={pricingType==='hourly'?'Hourly rate (USD)':'Starting price per job (USD)'}><input type="number" min="1" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></Field>{id&&<MediaEditor scope={`/v1/services/${id}`} value={media} onChange={setMedia} maxImages={4}/>}<Notice error={error}/><Button disabled={busy||profile.loading} onClick={()=>void(id?publish():create())}>{busy?'Saving…':profile.loading?'Loading profile…':id?'Publish service':'Continue to photos'}</Button></div></Dialog>;
}
function ServiceDetail({item,onClose,onRate,onContact}:{item:Row;onClose:()=>void;onRate:(n:number)=>void;onContact:()=>void}) {
  const { toast } = usePlatform();
  const profile=item.provider||{},[stars,setStars]=useState(0);
  const serviceImage = imageOf(item) || profile.photoUrl || '';
  useSeo({
    title: item.title,
    description: item.description || `${item.title} — ${money(item.rateUsd)}${item.pricingType==='hourly'?'/hr':' / job'} on Aura Liberia.`,
    image: serviceImage || undefined,
    url: `${location.origin}/services?item=${encodeURIComponent(item.id)}`,
    type: 'product',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: item.title,
      description: item.description || item.title,
      serviceType: item.category,
      ...(serviceImage ? { image: serviceImage } : {}),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: Number(item.rateUsd) || 0,
      },
    },
  });
  const shareService = async () => {
    const rawUrl = `${location.origin}/services?item=${encodeURIComponent(item.id)}`;
    const url = await auraShareUrl(rawUrl);
    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          text: `${item.title} — ${money(item.rateUsd)}${item.pricingType==='hourly'?'/hr':' / job'} on Aura Liberia`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast('Service link copied.');
      }
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') toast('Could not share this service.');
    }
  };
  return <Dialog title={item.title} onClose={onClose} wide><div className="a-service-detail"><div className="a-service-detail-media">{item.images?.length?<div className="a-grid">{item.images.map((src:string,i:number)=><Photo src={src} key={src} alt={`${item.title} ${i+1}`}/>)}</div>:<Photo src={imageOf(item)} alt={item.title} />}{item.videoUrl&&<video src={item.videoUrl} controls playsInline/>}</div><div className="a-service-detail-copy"><span className="a-service-cat">{item.category}</span><h2>{item.title}</h2><strong className="a-service-rate">{money(item.rateUsd)}{item.pricingType==='hourly'?'/hr':' / job'}</strong><p>{item.description}</p><div className="a-detail-vendor"><Photo src={profile.photoUrl||''} alt={profile.name||'Provider'}/><div><small>YOUR SERVICE PROVIDER</small><strong>{profile.name||'Local provider'}</strong><small>{profile.hasBusiness?profile.businessName:''}</small><small>{item.locality}, {item.county}</small></div></div><div className="a-service-rating"><strong><Star size={17} fill="#edae25"/> {(Number(item.rating)||0).toFixed(1)} ({item.reviewsCount||0})</strong><span>{item.reviewsCount?'Rate this provider':'No reviews yet · Be the first to rate'}</span><div>{[1,2,3,4,5].map(n=><button aria-label={`Rate ${n} stars`} key={n} className={stars>=n?'selected':''} onClick={()=>{setStars(n);onRate(n)}}><Star fill="currentColor"/></button>)}</div></div><div className="a-row" style={{gap:10,flexWrap:'wrap'}}><Button onClick={onContact}><MessageCircle size={17}/> Message provider</Button><Button secondary onClick={shareService}><Share2 size={17}/> Share</Button></div></div></div></Dialog>;
}
