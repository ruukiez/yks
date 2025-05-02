"use client";
import { useState, useEffect, useRef } from "react";
import { set as idbSet, get as idbGet } from 'idb-keyval';

/* ... diğer CSS kodlarınız ... */

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<{days: number, hours: number, minutes: number, seconds: number} | null>(null);

  function getTimeLeft() {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();
    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }

  useEffect(() => {
    setTimeLeft(getTimeLeft()); // İlk renderda zamanı ayarla
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return null; // İlk renderda boş dön

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-4 sm:gap-6 text-2xl sm:text-3xl font-[Orbitron] tracking-widest text-[#f3f4f6] select-none">
        <div className="flex flex-col items-center">
          <span>{String(timeLeft.days).padStart(2, "0")}</span>
          <span className="text-[10px] sm:text-xs text-[#a5b4fc] mt-1">Gün</span>
        </div>
        <span className="mt-2 sm:mt-3">:</span>
        <div className="flex flex-col items-center">
          <span>{String(timeLeft.hours).padStart(2, "0")}</span>
          <span className="text-[10px] sm:text-xs text-[#a5b4fc] mt-1">Saat</span>
        </div>
        <span className="mt-2 sm:mt-3">:</span>
        <div className="flex flex-col items-center">
          <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
          <span className="text-[10px] sm:text-xs text-[#a5b4fc] mt-1">Dakika</span>
        </div>
        <span className="mt-2 sm:mt-3">:</span>
        <div className="flex flex-col items-center">
          <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
          <span className="text-[10px] sm:text-xs text-[#a5b4fc] mt-1">Saniye</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"timer" | "questions">("timer");

  // Demo kullanıcı id'si (her sayfa yenilemede değişir)
  const userIdRef = useRef<string>("");
  useEffect(() => {
    userIdRef.current =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("demoUserId") || (() => {
            const id = Math.random().toString(36).slice(2);
            window.localStorage.setItem("demoUserId", id);
            return id;
          })())
        : "";
  }, []);

  // Nickname seçimi
  const [nickname, setNickname] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("nickname") || "";
      setNickname(saved);
    }
  }, []);
  function handleNicknameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNickname(e.target.value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("nickname", e.target.value);
    }
  }

  // Soru formu için state
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [filePreviews, setFilePreviews] = useState<{ id: string; name: string; type: string }[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Medya lightbox modalı için state
  const [lightbox, setLightbox] = useState<{ url: string; type: string } | null>(null);

  // Soruların state'i (kalıcı localStorage)
  const [questions, setQuestions] = useState<{
    id: string;
    userId: string;
    nickname: string;
    question: string;
    description: string;
    files: { id: string; name: string; type: string }[]; // sadece id, isim ve tip
    solved: boolean;
    comments: { id: string; userId: string; nickname: string; text: string; parentId?: string }[];
  }[]>([]);

  // Soru çözümü sekmesi için state
  const [questionTab, setQuestionTab] = useState<'unsolved' | 'solved'>('unsolved');

  // Dosya seçildiğinde IndexedDB'ye kaydet ve önizleme oluştur
  useEffect(() => {
    if (!files) {
      setFilePreviews([]);
      return;
    }
    Promise.all(Array.from(files).map(async file => {
      const id = Math.random().toString(36).slice(2);
      await idbSet(id, file);
      return { id, name: file.name, type: file.type };
    })).then(setFilePreviews);
  }, [files]);

  // Soruları localStorage'dan yükle
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("questions");
      if (saved) setQuestions(JSON.parse(saved));
    }
  }, []);
  // Soruları localStorage'a kaydet
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("questions", JSON.stringify(questions));
    }
  }, [questions]);

  // Sabit sınav tarihleri
  const tytDate = new Date("2025-06-21T10:15:00");
  const aytDate = new Date("2025-06-22T10:15:00");

  async function handleQuestionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    let fileArr: { id: string; name: string; type: string }[] = [];
    if (filePreviews.length > 0) {
      fileArr = filePreviews.map(f => ({ id: f.id, name: f.name, type: f.type }));
    }
    setQuestions(prev => [
      {
        id: Math.random().toString(36).slice(2),
        userId: userIdRef.current,
        nickname: nickname || "Anonim",
        question,
        description,
        files: fileArr,
        solved: false,
        comments: [],
      },
      ...prev
    ]);
    setQuestion("");
    setDescription("");
    setFiles(null);
    setFilePreviews([]);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 1500);
  }

  function handleSolvedChange(id: string, checked: boolean) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, solved: checked } : q));
  }

  // Zaman hesaplama fonksiyonu
  function timeAgo(date: Date | string) {
    const now = new Date();
    const d = typeof date === 'string' ? new Date(date) : date;
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return `${diff} saniye önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)} dakika önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  }

  // Resim dosyasını sıkıştıran yardımcı fonksiyon
  async function compressImage(file: File, maxSizeMB = 9.5): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        // Gerekirse boyutu küçült
        if (file.size > maxSizeMB * 1024 * 1024) {
          const scale = Math.sqrt((maxSizeMB * 1024 * 1024) / file.size);
          w = Math.floor(w * scale);
          h = Math.floor(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          if (blob && blob.size <= maxSizeMB * 1024 * 1024) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            reject(new Error('Resim küçültülemedi.')); 
          }
          URL.revokeObjectURL(url);
        }, file.type, 0.8);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  // Yorum formu bileşeni (tek seviyeli, dosya boyutu kontrolü, resim sıkıştırma)
  function CommentForm({ onSubmit, parentId, placeholder = "Yorum yaz..." }: { onSubmit: (text: string, files: { id: string; name: string; type: string }[]) => void; parentId?: string; placeholder?: string }) {
    const [text, setText] = useState("");
    const [files, setFiles] = useState<FileList | null>(null);
    const [filePreviews, setFilePreviews] = useState<{ id: string; name: string; type: string }[]>([]);
    const [fileError, setFileError] = useState<string>("");

    useEffect(() => {
      if (!files) {
        setFilePreviews([]);
        setFileError("");
        return;
      }
      (async () => {
        let previews: { id: string; name: string; type: string }[] = [];
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            let compressed = file;
            if (file.size > 10 * 1024 * 1024) {
              try {
                compressed = await compressImage(file);
                if (compressed.size > 10 * 1024 * 1024) {
                  setFileError('Resim 10MB altına küçültülemedi: ' + file.name);
                  setFilePreviews([]);
                  return;
                }
              } catch {
                setFileError('Resim küçültülemedi: ' + file.name);
                setFilePreviews([]);
                return;
              }
            }
            const id = Math.random().toString(36).slice(2);
            await idbSet(id, compressed);
            previews.push({ id, name: compressed.name, type: compressed.type });
          } else if (file.type === 'application/pdf') {
            if (file.size > 10 * 1024 * 1024) {
              setFileError("10MB'dan büyük PDF yüklenemez: " + file.name);
              setFilePreviews([]);
              return;
            }
            const id = Math.random().toString(36).slice(2);
            await idbSet(id, file);
            previews.push({ id, name: file.name, type: file.type });
          } else {
            setFileError('Sadece resim veya PDF yüklenebilir.');
            setFilePreviews([]);
            return;
          }
        }
        setFileError("");
        setFilePreviews(previews);
      })();
    }, [files]);

    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          if (text.trim() && !fileError) {
            onSubmit(text, filePreviews);
            setText("");
            setFiles(null);
            setFilePreviews([]);
          }
        }}
        className="flex flex-col gap-1 mt-2 w-full"
      >
        <div className="flex gap-2 w-full items-center">
          <input
            className="flex-1 p-1 rounded bg-[#232946] text-[#f3f4f6] border border-[#3949ab] text-sm"
            placeholder={placeholder}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <label className="relative inline-block">
            <span className="px-2 py-1 bg-[#3949ab] text-[#f3f4f6] rounded text-sm font-semibold cursor-pointer select-none">
              {files && files.length > 0 ? 'Seçildi' : 'Dosya Seç'}
            </span>
            <input
              type="file"
              className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer file:appearance-none hide-file-input-text"
              multiple
              accept="image/*,application/pdf"
              onChange={e => setFiles(e.target.files)}
              tabIndex={-1}
            />
          </label>
          <button type="submit" className="px-3 py-1 bg-[#3949ab] text-[#f3f4f6] rounded text-sm whitespace-nowrap">Gönder</button>
        </div>
        {fileError && <div className="text-xs text-red-400 mt-1">{fileError}</div>}
        {filePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {filePreviews.map((file, i) => (
              <MediaPreview key={i} file={file} />
            ))}
          </div>
        )}
      </form>
    );
  }

  // Soru kartında dosya önizlemesi (IndexedDB'den yükle)
  function MediaPreview({ file }: { file: { id: string; name: string; type: string } }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
      let revoked = false;
      idbGet(file.id).then((blob: File | undefined) => {
        if (blob && !revoked) {
          setUrl(URL.createObjectURL(blob));
        }
      });
      return () => {
        if (url) URL.revokeObjectURL(url);
        revoked = true;
      };
    }, [file.id]);
    if (!url) return <span className="text-xs text-[#a5b4fc]">{file.name}</span>;
    return (
      <div className="rounded overflow-hidden border border-[#3949ab]/30 bg-[#232946] p-1 cursor-pointer flex flex-col items-center w-32">
        {file.type.startsWith("image/") ? (
          <img src={url} alt={file.name} className="max-h-32 w-full object-contain" onClick={() => setLightbox({ url, type: file.type })} />
        ) : file.type === "application/pdf" ? (
          <>
            <embed src={url} type="application/pdf" className="w-28 h-28" />
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-[#a5b4fc] underline">Yeni Sekmede Aç</a>
          </>
        ) : (
          <>
            <span className="text-xs text-[#a5b4fc]">{file.name}</span>
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 text-xs text-[#a5b4fc] underline">Yeni Sekmede Aç</a>
          </>
        )}
      </div>
    );
  }

  // Yorumları tek seviyeli ve zaman bilgili göster => Her yorumun altına yanıt formu ekle
  function CommentList({ comments, qid, questionUserId }: { comments: any[]; qid: string; questionUserId: string }) {
    return (
      <div className="mt-2 space-y-4">
        {/* Always show the comment form at the top level */}
        <CommentForm onSubmit={(text, files) => handleAddComment(qid, text, undefined, files)} placeholder="Yorum yaz..." />
        {/* Then show existing comments */}
        {comments.filter(c => !c.parentId).map(c => (
          <CommentItem key={c.id} comment={c} comments={comments} qid={qid} questionUserId={questionUserId} />
        ))}
      </div>
    );
  }

  function CommentItem({ comment, comments, qid, questionUserId }: { comment: any, comments: any[], qid: string, questionUserId: string }) {
    const [showReplies, setShowReplies] = useState(false);
    const replies = comments.filter(r => r.parentId === comment.id);
    return (
      <div className="bg-[#20223a] rounded-lg p-3 w-full shadow-sm mb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-[#a5b4fc] font-semibold">
            {comment.nickname}
            {comment.userId === questionUserId && (
              <span title="Soru sahibi" className="ml-1 text-yellow-400">⭐️</span>
            )}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt || comment.id)}</span>
        </div>
        <div className="text-sm text-[#f3f4f6] mb-1 whitespace-pre-line">{comment.text}</div>
        {comment.files && comment.files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {comment.files.map((file: any, i: number) => (
              <MediaPreview key={i} file={file} />
            ))}
          </div>
        )}
        <CommentForm onSubmit={(text, files) => handleAddComment(qid, text, comment.id, files)} parentId={comment.id} placeholder="Yanıt yaz..." />
        {replies.length > 0 && (
          <button
            className="text-xs text-[#a5b4fc] hover:underline mt-2 mb-1 px-0 py-0 bg-transparent border-none outline-none focus:outline-none"
            style={{ background: 'none', border: 'none' }}
            onClick={() => setShowReplies(v => !v)}
          >
            {showReplies ? 'Yanıtları Gizle' : `Yanıtları Göster (${replies.length})`}
          </button>
        )}
        {showReplies && replies.length > 0 && (
          <div className="mt-2 pl-4 border-l border-[#3949ab]/10 space-y-2">
            {replies.map(r => (
              <CommentItem key={r.id} comment={r} comments={comments} qid={qid} questionUserId={questionUserId} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Yorum ekleme fonksiyonunu createdAt ile güncelle
  function handleAddComment(qid: string, text: string, parentId?: string, files: { id: string; name: string; type: string }[] = []) {
    setQuestions(prev => prev.map(q =>
      q.id === qid
        ? {
            ...q,
            comments: [
              ...q.comments,
              {
                id: Math.random().toString(36).slice(2),
                userId: userIdRef.current,
                nickname: nickname || "Anonim",
                text,
                parentId,
                files,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : q
    ));
  }

  // Soruları ayır
  const unsolvedQuestions = questions.filter(q => !q.solved);
  const solvedQuestions = questions.filter(q => q.solved);

  // Lightbox modalı
  if (lightbox) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setLightbox(null)}>
        <div className="relative max-w-3xl max-h-[90vh] flex items-center justify-center">
          <button className="absolute top-2 right-2 text-white text-2xl z-10" onClick={e => { e.stopPropagation(); setLightbox(null); }}>&times;</button>
          {lightbox.type.startsWith("image/") ? (
            <img src={lightbox.url} alt="media" className="max-h-[80vh] w-full sm:w-auto rounded shadow-lg" />
          ) : lightbox.type === "application/pdf" ? (
            <embed src={lightbox.url} type="application/pdf" className="w-[80vw] h-[80vh] rounded shadow-lg" />
          ) : (
            <span className="text-white">Dosya görüntülenemiyor</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11131a] text-[#f3f4f6] flex flex-col items-center font-[Inter,sans-serif] px-2 sm:px-0">
      {/* Modern, kutusuz, transparan header/nav */}
      <nav className="w-full flex justify-center fixed top-0 left-0 z-20 bg-[#181a20]/80 backdrop-blur-md border-b border-[#232946] shadow-lg">
        <div className="flex gap-8 py-6 w-full max-w-2xl justify-center items-center">
          <button
            className={`relative px-2 sm:px-6 py-2 font-semibold text-lg sm:text-xl transition-colors border-b-2 border-transparent flex flex-col items-center group
              ${activeTab === "timer"
                ? "text-[#f3f4f6] border-[#3949ab]"
                : "text-gray-400 hover:text-[#f3f4f6] hover:border-[#3949ab]"}
            `}
            onClick={() => setActiveTab("timer")}
          >
            Zamanlayıcı
            {/* Çizgi ve blur: sadece seçili veya hover'da, kalınlık aynı */}
            {(activeTab === "timer") && (
              <>
                <span className="absolute left-0 right-0 -bottom-1 h-1 bg-[#3949ab] rounded-full"></span>
                <span className="absolute left-0 right-0 -bottom-1 h-1 bg-[#3949ab] rounded-full blur-[2px] opacity-80"></span>
              </>
            )}
            {(activeTab !== "timer") && (
              <span className="absolute left-0 right-0 -bottom-1 h-1 bg-[#3949ab] rounded-full opacity-60 blur-[5px] group-hover:opacity-80 group-hover:blur-[2px] hidden group-hover:block"></span>
            )}
          </button>
          <button
            className={`relative px-2 sm:px-6 py-2 font-semibold text-lg sm:text-xl transition-colors border-b-2 border-transparent flex flex-col items-center group
              ${activeTab === "questions"
                ? "text-[#f3f4f6] border-[#3949ab]"
                : "text-gray-400 hover:text-[#f3f4f6] hover:border-[#3949ab]"}
            `}
            onClick={() => setActiveTab("questions")}
          >
            Soru Çözümü
            {/* Çizgi ve blur: sadece seçili veya hover'da, kalınlık aynı */}
            {(activeTab === "questions") && (
              <>
                <span className="absolute left-0 right-0 -bottom-1 h-1 bg-[#3949ab] rounded-full"></span>
                <span className="absolute left-0 right-0 -bottom-1 h-1 bg-[#3949ab] rounded-full blur-[2px] opacity-80"></span>
              </>
            )}
            {(activeTab !== "questions") && (
              <span className="absolute left-0 right-0 -bottom-1 h-1 bg-[#3949ab] rounded-full opacity-60 blur-[5px] group-hover:opacity-80 group-hover:blur-[2px] hidden group-hover:block"></span>
            )}
          </button>
        </div>
      </nav>
      {/* İçerik */}
      <main className="flex-1 w-full flex flex-col items-center justify-start pt-36 sm:pt-32">
        {activeTab === "timer" && (
          <section className="w-full max-w-2xl mx-auto flex flex-col gap-8">
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-xl bg-[#232946]/70 rounded-2xl p-6 sm:p-8 flex flex-col items-center shadow-2xl backdrop-blur-md border border-[#3949ab]/30" style={{overflow: 'hidden'}}>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-[#a5b4fc]">TYT</h2>
                <CountdownTimer targetDate={tytDate} />
              </div>
            </div>
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-xl bg-[#232946]/70 rounded-2xl p-6 sm:p-8 flex flex-col items-center shadow-2xl backdrop-blur-md border border-[#3949ab]/30" style={{overflow: 'hidden'}}>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-[#a5b4fc]">AYT</h2>
                <CountdownTimer targetDate={aytDate} />
              </div>
            </div>
          </section>
        )}

        {activeTab === "questions" && (
          <section className="w-full max-w-2xl bg-[#232946] rounded-xl p-8 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-[#a5b4fc]">Soru Paylaş & Çözüm Al</h2>
            {/* Nickname alanı */}
            <div className="mb-4 flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#a5b4fc]">Nick:</label>
                <input
                  className="p-1 rounded bg-[#1a1a2e] text-[#f3f4f6] border border-[#3949ab] text-sm"
                  placeholder="Bir takma ad girin"
                  value={nickname}
                  onChange={handleNicknameChange}
                  maxLength={20}
                />
              </div>
              <label className="relative inline-block ml-auto">
                <span className="px-2 py-1 bg-[#3949ab] text-[#f3f4f6] rounded text-sm font-semibold cursor-pointer select-none">
                  {files && files.length > 0 ? 'Seçildi' : 'Dosya Seç'}
                </span>
                <input
                  type="file"
                  className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer file:appearance-none hide-file-input-text"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={e => setFiles(e.target.files)}
                  tabIndex={-1}
                />
              </label>
            </div>
            {/* Soru ekleme formu */}
            <form className="mb-8 space-y-2 w-full" onSubmit={handleQuestionSubmit}>
              <input
                className="w-full p-2 rounded bg-[#1a1a2e] text-[#f3f4f6] border border-[#3949ab]"
                placeholder="Soru başlığı veya metni..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                required
              />
              <textarea
                className="w-full p-2 rounded bg-[#1a1a2e] text-[#f3f4f6] border border-[#3949ab]"
                placeholder="Açıklama (isteğe bağlı)"
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <button className="bg-[#3949ab] text-[#f3f4f6] px-4 py-2 rounded font-semibold w-full hover:bg-[#5c6bc0] transition-colors" type="submit">
                Soru Paylaş
              </button>
              {submitted && (
                <div className="text-green-400 text-sm mt-2">Soru başarıyla gönderildi!</div>
              )}
            </form>
            {/* Sekmeler */}
            <div className="flex gap-4 mb-6 justify-center">
              <button
                className={`px-4 py-2 font-semibold rounded-t transition-colors border-b-2 ${questionTab === 'unsolved' ? 'border-[#3949ab] text-[#a5b4fc] bg-[#181a20]' : 'border-transparent text-gray-400 hover:text-[#a5b4fc] hover:border-[#3949ab]'}`}
                onClick={() => setQuestionTab('unsolved')}
              >
                Çözülmeyi Bekleyen Sorular
              </button>
              <button
                className={`px-4 py-2 font-semibold rounded-t transition-colors border-b-2 ${questionTab === 'solved' ? 'border-[#3949ab] text-[#a5b4fc] bg-[#181a20]' : 'border-transparent text-gray-400 hover:text-[#a5b4fc] hover:border-[#3949ab]'}`}
                onClick={() => setQuestionTab('solved')}
              >
                Çözülen Sorular
              </button>
            </div>
            {/* Sorular */}
            {questionTab === 'unsolved' ? (
              <div className="space-y-6 mb-8">
                {unsolvedQuestions.length === 0 && (
                  <div className="text-gray-400">Henüz çözülmeyi bekleyen soru yok.</div>
                )}
                {unsolvedQuestions.map(q => (
                  <div key={q.id} className="bg-[#181a20] p-6 rounded-xl shadow flex flex-col gap-3 border border-[#3949ab]/20 w-full max-w-full sm:max-w-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#a5b4fc] font-bold text-sm">{q.nickname}</span>
                      <span className="text-xs text-gray-400">(Soran)</span>
                    </div>
                    <div className="font-semibold text-lg text-[#f3f4f6]">{q.question}</div>
                    {q.description && <div className="text-sm text-gray-300">{q.description}</div>}
                    {q.files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {q.files.map((file, i) => (
                          <MediaPreview key={i} file={file} />
                        ))}
                      </div>
                    )}
                    {/* Sadece soruyu soran kişi için checkbox */}
                    {q.userId === userIdRef.current && (
                      <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.solved}
                          onChange={e => handleSolvedChange(q.id, e.target.checked)}
                          className="accent-[#3949ab]"
                        />
                        Çözüldü olarak işaretle
                      </label>
                    )}
                    {/* Yorumlar */}
                    <div className="mt-4">
                      <div className="text-xs text-[#a5b4fc] font-bold mb-1">Yorumlar</div>
                      <CommentList comments={q.comments} qid={q.id} questionUserId={q.userId} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {solvedQuestions.length === 0 && (
                  <div className="text-gray-400">Henüz çözülen soru yok.</div>
                )}
                {solvedQuestions.map(q => (
                  <div key={q.id} className="bg-[#181a20] p-6 rounded-xl shadow flex flex-col gap-3 border border-[#3949ab]/20 opacity-70 w-full max-w-full sm:max-w-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#a5b4fc] font-bold text-sm">{q.nickname}</span>
                      <span className="text-xs text-gray-400">(Soran)</span>
                    </div>
                    <div className="font-semibold text-lg text-[#f3f4f6]">{q.question}</div>
                    {q.description && <div className="text-sm text-gray-300">{q.description}</div>}
                    {q.files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {q.files.map((file, i) => (
                          <MediaPreview key={i} file={file} />
                        ))}
                      </div>
                    )}
                    {/* Yorumlar */}
                    <div className="mt-4">
                      <div className="text-xs text-[#a5b4fc] font-bold mb-1">Yorumlar</div>
                      <CommentList comments={q.comments} qid={q.id} questionUserId={q.userId} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
