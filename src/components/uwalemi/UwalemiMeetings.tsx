import React, { useState } from 'react';
import { UwalemiState, UwalemiMeeting, UwalemiMeetingAttendee } from '../../types/uwalemi';
import { sortMembersByLeadership } from '../../services/uwalemiService';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Send, 
  FileText, 
  Edit3, 
  X,
  Share2,
  Printer
} from 'lucide-react';

interface Props {
  state: UwalemiState;
  onSaveState: (state: UwalemiState) => Promise<boolean>;
  onOpenSmsWithTemplate?: (recipients: { name: string; phone: string; memberNo: string }[], templateText: string) => void;
}

export const UwalemiMeetings: React.FC<Props> = ({ state, onSaveState, onOpenSmsWithTemplate }) => {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    state.meetings?.[0]?.id || null
  );

  // Modals
  const [isNewMeetingModalOpen, setIsNewMeetingModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);

  // Meeting Form
  const [meetingForm, setMeetingForm] = useState<{
    title: string;
    date: string;
    time: string;
    location: string;
    agendas: string[];
    newAgendaInput: string;
  }>({
    title: 'Kikao cha Kawaida cha Mwezi',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    time: '14:00 - 17:00',
    location: 'Sinza, Dar es Salaam',
    agendas: [
      'Kufungua kikao na sala',
      'Kupitia muhtasari wa kikao kilichopita',
      'Taarifa ya mapato, ada na matumizi ya hazina',
      'Mengineyo na kufunga kikao'
    ],
    newAgendaInput: ''
  });

  // Minutes State
  const [minutesText, setMinutesText] = useState('');
  const [resolutionsList, setResolutionsList] = useState<string[]>([]);
  const [newResolutionInput, setNewResolutionInput] = useState('');

  const members = sortMembersByLeadership(state.members || []);
  const meetings = state.meetings || [];
  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId) || meetings[0];

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.date) {
      alert('Tafadhali jaza Jina na Tarehe ya Kikao.');
      return;
    }

    const newMeeting: UwalemiMeeting = {
      id: `mtg-${Date.now()}`,
      meetingNo: meetings.length + 1,
      title: meetingForm.title,
      date: meetingForm.date,
      time: meetingForm.time,
      location: meetingForm.location,
      agendas: meetingForm.agendas,
      attendees: members.map(m => ({
        memberId: m.id,
        memberNo: m.memberNo,
        memberName: m.fullName,
        status: 'present',
        fineAmount: 0,
        finePaid: false
      })),
      status: 'upcoming'
    };

    const updatedMeetings = [newMeeting, ...meetings];
    await onSaveState({ ...state, meetings: updatedMeetings });
    setSelectedMeetingId(newMeeting.id);
    setIsNewMeetingModalOpen(false);
  };

  const handleUpdateAttendance = async (attendees: UwalemiMeetingAttendee[]) => {
    if (!selectedMeeting) return;

    const updatedMeeting: UwalemiMeeting = {
      ...selectedMeeting,
      attendees
    };

    const updatedMeetings = meetings.map(m => m.id === selectedMeeting.id ? updatedMeeting : m);
    await onSaveState({ ...state, meetings: updatedMeetings });
  };

  const handleSaveMinutes = async () => {
    if (!selectedMeeting) return;

    const updatedMeeting: UwalemiMeeting = {
      ...selectedMeeting,
      minutes: minutesText,
      resolutions: resolutionsList,
      status: 'completed'
    };

    const updatedMeetings = meetings.map(m => m.id === selectedMeeting.id ? updatedMeeting : m);
    await onSaveState({ ...state, meetings: updatedMeetings });
    setIsMinutesModalOpen(false);
  };

  const handleSendMeetingAlert = () => {
    if (!selectedMeeting) return;

    const recipients = members.filter(m => m.status === 'active').map(m => ({
      name: m.fullName,
      phone: m.phone,
      memberNo: m.memberNo
    }));

    const templateText = `TAARIFA YA KIKAO CHA UWALEMI\nHabari {name}, unataarifiwa kuhudhuria ${selectedMeeting.title}.\n📅 Tarehe: ${selectedMeeting.date}\n⏰ Muda: ${selectedMeeting.time}\n📍 Eneo: ${selectedMeeting.location}\n\nTafadhali fika bila kukosa.`;

    if (onOpenSmsWithTemplate) {
      onOpenSmsWithTemplate(recipients, templateText);
    }
  };

  // Compute attendance stats
  const attendees = selectedMeeting?.attendees || [];
  const presentCount = attendees.filter(a => a.status === 'present').length;
  const apologyCount = attendees.filter(a => a.status === 'apology').length;
  const absentCount = attendees.filter(a => a.status === 'absent').length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="uwalemi-meetings">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            Ratiba ya Vikao & Mahudhurio ya Wajumbe
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upangaji wa vikao vya kila mwezi, mahudhurio ya wajumbe 50, faini za utoro, na kumbukumbu za maazimio (Minutes).
          </p>
        </div>

        <button
          onClick={() => {
            setMeetingForm({
              title: `Kikao cha Kawaida cha Mwezi`,
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              time: '14:00 - 17:00',
              location: 'Sinza, Dar es Salaam',
              agendas: [
                'Kufungua kikao na sala',
                'Kupitia muhtasari wa kikao kilichopita',
                'Taarifa ya mapato, ada na matumizi ya hazina',
                'Mengineyo na kufunga kikao'
              ],
              newAgendaInput: ''
            });
            setIsNewMeetingModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Panga Kikao Kipya
        </button>
      </div>

      {/* Meetings Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {meetings.map(m => {
          const isSelected = selectedMeeting?.id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMeetingId(m.id)}
              className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-blue-950/30 border-blue-500/60 shadow-lg shadow-blue-950/50' 
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  Kikao Na. {m.meetingNo || 1}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  m.status === 'upcoming' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                  {m.status === 'upcoming' ? 'Kinachokuja' : 'Kimekamilika'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white line-clamp-1">{m.title}</h3>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" /> {m.date} ({m.time})
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {m.location}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Meeting Details */}
      {selectedMeeting ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Kikao Na. {selectedMeeting.meetingNo}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {selectedMeeting.date}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {selectedMeeting.time}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mt-1.5">{selectedMeeting.title}</h3>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Eneo la Kikao: <strong className="text-slate-200">{selectedMeeting.location}</strong>
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleSendMeetingAlert}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Tuma Wito wa Kikao (SMS/WhatsApp)
              </button>

              <button
                onClick={() => {
                  setMinutesText(selectedMeeting.minutes || '');
                  setResolutionsList(selectedMeeting.resolutions || []);
                  setIsMinutesModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                Muhtasari & Maazimio
              </button>
            </div>
          </div>

          {/* Agendas & Attendance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ajenda za Kikao */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Ajenda Zilizopangwa ({selectedMeeting.agendas?.length || 0})
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {(selectedMeeting.agendas || []).map((ag, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{ag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Attendance Overview Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Mahudhurio ya Wajumbe
                </h4>
                <button
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer"
                >
                  Chukua Mahudhurio →
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="p-3 bg-slate-900 rounded-lg text-center border border-slate-800">
                  <span className="text-xs text-slate-400 block">Waliohudhuria</span>
                  <span className="text-lg font-bold text-emerald-400 mt-0.5 block">{presentCount}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg text-center border border-slate-800">
                  <span className="text-xs text-slate-400 block">Udhuru</span>
                  <span className="text-lg font-bold text-amber-400 mt-0.5 block">{apologyCount}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg text-center border border-slate-800">
                  <span className="text-xs text-slate-400 block">Wasiohudhuria</span>
                  <span className="text-lg font-bold text-rose-400 mt-0.5 block">{absentCount}</span>
                </div>
              </div>

              {selectedMeeting.minutes && (
                <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 line-clamp-2">
                  <strong className="text-slate-300">Muhtasari: </strong> {selectedMeeting.minutes}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL: CREATE MEETING */}
      {isNewMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Panga Kikao Kipya cha UWALEMI
              </h3>
              <button onClick={() => setIsNewMeetingModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Jina la Kikao *</label>
                <input
                  type="text"
                  required
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  placeholder="Mfano: Kikao cha Kawaida cha Mwezi Agosti"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Tarehe ya Kikao *</label>
                  <input
                    type="date"
                    required
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Muda (Masaa)</label>
                  <input
                    type="text"
                    value={meetingForm.time}
                    onChange={(e) => setMeetingForm({ ...meetingForm, time: e.target.value })}
                    placeholder="14:00 - 17:00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Ukumbi au Eneo la Kikao *</label>
                <input
                  type="text"
                  required
                  value={meetingForm.location}
                  onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
                  placeholder="Sinza / Ukumbi wa Vatican / Kijitonyama"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Agendas Builder */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Ajenda za Kikao</label>
                <div className="space-y-1.5 mb-2">
                  {meetingForm.agendas.map((ag, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                      <span>{idx + 1}. {ag}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = meetingForm.agendas.filter((_, i) => i !== idx);
                          setMeetingForm({ ...meetingForm, agendas: updated });
                        }}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meetingForm.newAgendaInput}
                    onChange={(e) => setMeetingForm({ ...meetingForm, newAgendaInput: e.target.value })}
                    placeholder="Andika ajenda mpya..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && meetingForm.newAgendaInput.trim()) {
                        e.preventDefault();
                        setMeetingForm({
                          ...meetingForm,
                          agendas: [...meetingForm.agendas, meetingForm.newAgendaInput.trim()],
                          newAgendaInput: ''
                        });
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (meetingForm.newAgendaInput.trim()) {
                        setMeetingForm({
                          ...meetingForm,
                          agendas: [...meetingForm.agendas, meetingForm.newAgendaInput.trim()],
                          newAgendaInput: ''
                        });
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                  >
                    + Ongeza
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewMeetingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 cursor-pointer"
                >
                  Panga Kikao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ATTENDANCE REGISTER */}
      {isAttendanceModalOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Daftari la Mahudhurio: {selectedMeeting.title}
                </h3>
                <p className="text-xs text-slate-400">Tarehe: {selectedMeeting.date} • Eneo: {selectedMeeting.location}</p>
              </div>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
              {members.map(m => {
                const att = (selectedMeeting.attendees || []).find(a => a.memberId === m.id) || {
                  memberId: m.id,
                  memberNo: m.memberNo,
                  memberName: m.fullName,
                  status: 'present' as const
                };

                const updateStatus = (newStatus: 'present' | 'absent' | 'apology') => {
                  const updatedAttendees = members.map(mem => {
                    if (mem.id === m.id) {
                      return {
                        memberId: mem.id,
                        memberNo: mem.memberNo,
                        memberName: mem.fullName,
                        status: newStatus,
                        fineAmount: newStatus === 'absent' ? (state.groupSettings.meetingFineDefault || 5000) : 0,
                        finePaid: false
                      };
                    }
                    const existing = (selectedMeeting.attendees || []).find(a => a.memberId === mem.id);
                    return existing || {
                      memberId: mem.id,
                      memberNo: mem.memberNo,
                      memberName: mem.fullName,
                      status: 'present' as const
                    };
                  });
                  handleUpdateAttendance(updatedAttendees);
                };

                const toggleFinePaid = () => {
                  const updatedAttendees = members.map(mem => {
                    const existing = (selectedMeeting.attendees || []).find(a => a.memberId === mem.id);
                    if (mem.id === m.id) {
                      return {
                        memberId: mem.id,
                        memberNo: mem.memberNo,
                        memberName: mem.fullName,
                        status: att.status,
                        fineAmount: att.fineAmount || (state.groupSettings.meetingFineDefault || 5000),
                        finePaid: !att.finePaid
                      };
                    }
                    return existing || {
                      memberId: mem.id,
                      memberNo: mem.memberNo,
                      memberName: mem.fullName,
                      status: 'present' as const
                    };
                  });
                  handleUpdateAttendance(updatedAttendees);
                };

                return (
                  <div key={m.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-emerald-400 mr-2">{m.memberNo}</span>
                        <span className="font-semibold text-white">{m.fullName}</span>
                        <span className="text-slate-500 ml-2">({m.role})</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateStatus('present')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            att.status === 'present'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          ✓ Ahudhuria
                        </button>
                        <button
                          onClick={() => updateStatus('apology')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            att.status === 'apology'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          ⏱ Udhuru
                        </button>
                        <button
                          onClick={() => updateStatus('absent')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            att.status === 'absent'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          ✕ Hakuhudhuria
                        </button>
                      </div>
                    </div>

                    {(att.status === 'absent' || (att.fineAmount && att.fineAmount > 0)) && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                        <span className="text-rose-400 font-medium">
                          Faini ya Utoro/Kuchelewa: <strong>TZS {(att.fineAmount || (state.groupSettings.meetingFineDefault || 5000)).toLocaleString()}</strong>
                        </span>
                        <button
                          onClick={toggleFinePaid}
                          className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                            att.finePaid
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-300'
                          }`}
                        >
                          {att.finePaid ? '✓ Faini Imelipwa' : '✗ Deni (Bonyeza Kubadili iwe Imelipwa)'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAttendanceModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Hifadhi na Funga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MINUTES & RESOLUTIONS */}
      {isMinutesModalOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Muhtasari & Maazimio ya Kikao
              </h3>
              <button onClick={() => setIsMinutesModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Muhtasari wa Kikao (Minutes Summary)</label>
                <textarea
                  rows={6}
                  value={minutesText}
                  onChange={(e) => setMinutesText(e.target.value)}
                  placeholder="Andika muhtasari wa yaliyojadiliwa katika kikao hiki..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Maazimio Yaliyofikiwa (Resolutions)</label>
                <div className="space-y-1.5 mb-2">
                  {resolutionsList.map((res, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300">
                      <span>✓ {res}</span>
                      <button
                        onClick={() => setResolutionsList(resolutionsList.filter((_, i) => i !== idx))}
                        className="text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newResolutionInput}
                    onChange={(e) => setNewResolutionInput(e.target.value)}
                    placeholder="Andika azimio jipya..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newResolutionInput.trim()) {
                        e.preventDefault();
                        setResolutionsList([...resolutionsList, newResolutionInput.trim()]);
                        setNewResolutionInput('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newResolutionInput.trim()) {
                        setResolutionsList([...resolutionsList, newResolutionInput.trim()]);
                        setNewResolutionInput('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-semibold cursor-pointer"
                  >
                    + Ongeza Azimio
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsMinutesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Ghairi
              </button>
              <button
                onClick={handleSaveMinutes}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                Hifadhi Muhtasari
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
