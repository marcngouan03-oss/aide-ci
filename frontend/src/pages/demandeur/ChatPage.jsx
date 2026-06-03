import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { messageAPI, prestataireAPI, missionAPI } from '../../utils/api';
import { Spin, Modal, Btn } from '../../components/ui/index';

export default function ChatPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { emit, on, off } = useSocket();
  const navigate = useNavigate();
  const bottomRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [other,    setOther]    = useState(null);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [mf, setMf] = useState({ description:'', montant:'', moyenPaiement:'orange_money', adresseTravail:'' });
  const [mfErr, setMfErr] = useState('');

  useEffect(() => {
    Promise.all([messageAPI.get(userId), prestataireAPI.getOne(userId)])
      .then(([mr, pr]) => { setMessages(mr.data.messages||[]); setOther(pr.data.prestataire); })
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    const h = (msg) => {
      const sid = msg.expediteur?._id || msg.expediteur;
      if (sid===userId || msg.destinataire===userId) setMessages(p=>[...p,msg]);
    };
    on('new_message', h);
    return () => off('new_message', h);
  }, [userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    emit('send_message', { destinataireId:userId, contenu:text.trim() });
    setMessages(p=>[...p,{ _id:Date.now(), expediteur:{_id:user._id}, contenu:text, createdAt:new Date() }]);
    setText('');
  };

  const creerMission = async () => {
    if (!mf.description.trim()) return setMfErr('Description obligatoire');
    if (!mf.montant || isNaN(mf.montant) || Number(mf.montant)<=0) return setMfErr('Montant invalide');
    setMfErr(''); setCreating(true);
    try {
      const r = await missionAPI.create({ prestataireId:userId, ...mf, montant:Number(mf.montant) });
      emit('send_message', { destinataireId:userId,
        contenu:`Mission creee: ${mf.description} — ${Number(mf.montant).toLocaleString()} FCFA. Paiement en attente.`,
        type:'systeme' });
      setShowModal(false);
      navigate(`/payment/${r.data.mission._id}`);
    } catch(err) { setMfErr(err.response?.data?.message||'Erreur'); }
    finally { setCreating(false); }
  };

  const fmt = d => new Date(d).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit'});

  if (loading) return <div className="h-dvh flex items-center justify-center"><Spin/></div>;

  return (
    <div className="h-dvh flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 border-b border-[#E5E5E5]">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 border border-[#E5E5E5] hover:border-[#111] flex items-center justify-center text-sm font-bold">←</button>
        <div className="w-10 h-10 bg-[#111] flex items-center justify-center text-white font-bold"
          style={{ fontFamily:'Syne,sans-serif' }}>
          {(other?.prenom?.[0]||'')}{(other?.nom?.[0]||'')}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm uppercase tracking-wide" style={{ fontFamily:'Syne,sans-serif' }}>
            {other?.prenom} {other?.nom}
          </h3>
          <p className="text-[10px]" style={{ color: other?.enLigne?'#22C55E':'#767676' }}>
            {other?.enLigne ? 'En ligne' : 'Hors ligne'} — {other?.profession}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length===0 && (
          <div className="text-center py-12">
            <div className="w-8 h-px bg-[#E5E5E5] mx-auto mb-4"/>
            <p className="text-xs uppercase tracking-widest text-[#767676]" style={{ fontFamily:'Syne,sans-serif' }}>
              Demarrez la conversation
            </p>
          </div>
        )}
        {messages.map((msg,i) => {
          const isMe = (msg.expediteur?._id||msg.expediteur)===user._id;
          if (msg.type==='systeme') return (
            <div key={msg._id||i} className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-[#FFF4EE] text-[#E8590A]"
                style={{ fontFamily:'Syne,sans-serif' }}>{msg.contenu}</span>
            </div>
          );
          return (
            <div key={msg._id||i} className={`flex ${isMe?'justify-end':'justify-start'}`}>
              <div className="max-w-[78%]">
                <div className={`px-4 py-3 text-sm leading-relaxed ${isMe
                  ? 'bg-[#111] text-white' : 'bg-[#F7F7F5] text-[#111] border border-[#E5E5E5]'}`}>
                  {msg.contenu}
                </div>
                <p className="text-[10px] mt-1 text-[#767676]">{fmt(msg.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Escrow CTA — only for demandeur */}
      {user?.role==='demandeur' && (
        <div className="mx-4 mb-2 flex items-center gap-3 p-4 bg-[#111]">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-xs uppercase tracking-widest text-white"
              style={{ fontFamily:'Syne,sans-serif' }}>Accord trouve ?</p>
            <p className="text-[10px] text-[#767676] mt-0.5">Paiement escrow securise — admin valide avant transfert</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-[#E8590A] text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
            style={{ fontFamily:'Syne,sans-serif', flexShrink:0 }}>
            Deposer
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={send} className="flex items-center gap-3 px-4 pb-6 pt-2 border-t border-[#E5E5E5]">
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Votre message..."
          className="flex-1 bg-[#F7F7F5] border border-[#E5E5E5] px-4 py-3 text-sm outline-none focus:border-[#111]"/>
        <button type="submit"
          className="w-11 h-11 bg-[#111] text-white text-base hover:bg-[#333] transition-colors flex-shrink-0 flex items-center justify-center">
          →
        </button>
      </form>

      {/* Mission Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Creer une mission">
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] block mb-1.5"
              style={{ fontFamily:'Syne,sans-serif' }}>Description du travail *</label>
            <input value={mf.description} onChange={e=>setMf(p=>({...p,description:e.target.value}))}
              placeholder="Ex: Reparer une fuite sous l'evier"
              className="w-full border-b border-[#E5E5E5] focus:border-[#111] py-3 text-sm outline-none"/>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] block mb-1.5"
              style={{ fontFamily:'Syne,sans-serif' }}>Montant convenu (FCFA) *</label>
            <input type="number" value={mf.montant} onChange={e=>setMf(p=>({...p,montant:e.target.value}))}
              placeholder="10000"
              className="w-full border-b border-[#E5E5E5] focus:border-[#111] py-3 text-sm outline-none"/>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] block mb-1.5"
              style={{ fontFamily:'Syne,sans-serif' }}>Adresse du travail</label>
            <input value={mf.adresseTravail} onChange={e=>setMf(p=>({...p,adresseTravail:e.target.value}))}
              placeholder="Cocody, Riviera..."
              className="w-full border-b border-[#E5E5E5] focus:border-[#111] py-3 text-sm outline-none"/>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#767676] block mb-1.5"
              style={{ fontFamily:'Syne,sans-serif' }}>Moyen de paiement *</label>
            <select value={mf.moyenPaiement} onChange={e=>setMf(p=>({...p,moyenPaiement:e.target.value}))}
              className="w-full border-b border-[#E5E5E5] focus:border-[#111] py-3 text-sm bg-transparent outline-none">
              <option value="orange_money">Orange Money</option>
              <option value="moov_money">Moov Money</option>
              <option value="wave">Wave</option>
            </select>
          </div>
          {mfErr && <p className="text-xs text-red-500 border-l-4 border-red-500 pl-2">{mfErr}</p>}
          <div className="bg-[#FFF4EE] border border-[#E8590A]/20 p-3 text-xs text-[#767676]">
            L'argent est bloque chez l'admin jusqu'a validation du travail. Le prestataire ne recoit rien tant que vous n'avez pas confirme.
          </div>
          <Btn size="lg" fullWidth variant="orange" loading={creating} onClick={creerMission}>
            Confirmer et payer
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
