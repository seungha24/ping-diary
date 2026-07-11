import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
  ActivityIndicator, Image,
} from 'react-native';
import TouchableOpacity from '../components/Touchable';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import Tag from '../components/Tag';
import { AspectPhoto } from '../components/PhotoThumb';
import PhotoLightbox from '../components/PhotoLightbox';
import IconChev from '../components/icons/IconChev';
import IconEdit from '../components/icons/IconEdit';
import IconTrash from '../components/icons/IconTrash';
import { useTheme, hexToRgba } from '../context/ThemeContext';
import { useEntries } from '../context/EntriesContext';
import { useGroups } from '../context/GroupsContext';
import { PERSONAS, DiaryFolder, entryDateLabel, mergeFolders, parseBodySegments, extractQuestion } from '../data/types';
import { generateComment, reportContent, getCachedMe } from '../api';
import { notify } from '../notify';
import Svg, { Path, Line } from 'react-native-svg';
import { IconLock, IconX, IconSparkle, IconTrash as IconTrashLine, IconFolder, PersonaIcon } from '../components/icons/Line';
import { useThemedStyles } from '../theme/themed';
import SheetWrap from '../components/SheetWrap';
import { animateLayout } from '../anim';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Route = RouteProp<RootStackParamList, 'DiaryDetail'>;

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const PERSONA_EMOJI: Record<string, string> = {
  '선생님': '📖', '엄마': '🌸', '상담사': '💆', '미래의 나': '🔮',
};

// AI 코멘트가 공개되기까지의 대기 시간 (서버 scheduler.js COMMENT_DELAY_HOURS와 맞춤)
const COMMENT_UNLOCK_HOURS = 10;

function useCountdown(createdAt: string) {
  const unlockAt = new Date(createdAt).getTime() + COMMENT_UNLOCK_HOURS * 60 * 60 * 1000;
  const [remaining, setRemaining] = useState(unlockAt - Date.now());
  useEffect(() => {
    if (unlockAt - Date.now() <= 0) return;
    const id = setInterval(() => {
      const left = unlockAt - Date.now();
      setRemaining(left);
      if (left <= 0) clearInterval(id); // 0 도달 후에도 1초마다 리렌더되는 것 방지
    }, 1000);
    return () => clearInterval(id);
  }, [unlockAt]);
  return remaining;
}

export default function DiaryDetailScreen() {
  const styles = useThemedStyles(lightStyles);
  const navigation = useNavigation<Nav>();
  const { entry: routeEntry } = useRoute<Route>().params;
  const { accent } = useTheme();
  const { deleteEntry, updateLocal, updateEntry, entries } = useEntries();
  // 수정 후 돌아와도 최신 내용이 바로 보이게, 라우트 스냅샷 대신 컨텍스트의 최신 엔트리를 사용
  const entry = entries.find((e) => e.id === routeEntry.id) ?? routeEntry;
  const remaining = useCountdown(entry.createdAt);
  const isUnlocked = remaining <= 0;
  const { groups } = useGroups();
  // 내 글인지: authorId가 없으면 내 목록에서 연 글, 있으면 내 id와 비교 (그룹 피드에서 연 남의 글은 읽기 전용)
  const isMine = !entry.authorId || entry.authorId === getCachedMe()?.id;
  // 사진 갤러리: 대표는 크게, 나머지는 작게. 탭하면 확대 보기
  // 본문 중간([photo:URL])에 이미 들어간 사진은 상단에서 중복 표시하지 않는다
  const { question, rest: bodyText } = extractQuestion(entry.body);
  const bodyPhotoUrls = new Set(
    parseBodySegments(bodyText).filter((s) => s.type === 'photo').map((s: any) => s.url)
  );
  const gallery = ([entry.photo, ...(entry.photos ?? [])].filter(Boolean) as string[])
    .filter((u) => !bodyPhotoUrls.has(u));
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [published, setPublished] = useState(entry.visibility === 'friends');
  const [publishing, setPublishing] = useState(false);
  // 공유 대상 그룹 선택: 기존 friends+null(전체 공개)이던 글은 모든 그룹 체크로 시작
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(() => {
    if (entry.visibility !== 'friends') return new Set();
    if (entry.sharedGroups && entry.sharedGroups.length) return new Set(entry.sharedGroups);
    return new Set(groups.map((g) => g.id));
  });
  const [aiComment, setAiComment] = useState<string | undefined>(entry.aiComment);
  const [aiOpen, setAiOpen] = useState(true); // AI 코멘트 접기/펼치기
  const [persona, setPersona] = useState(entry.persona);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [folder, setFolder] = useState<string | undefined>(entry.folder);
  const [folderOpen, setFolderOpen] = useState(false);

  // 수정 화면에서 바꾼 내용(페르소나·코멘트·폴더·공개범위)이 돌아오자마자 반영되게 동기화
  useEffect(() => {
    setAiComment(entry.aiComment);
    setPersona(entry.persona);
    setFolder(entry.folder);
    setPublished(entry.visibility === 'friends');
  }, [entry.aiComment, entry.persona, entry.folder, entry.visibility]);

  // 홈 화면과 동일한 순서(사용자 재정렬 반영)로 폴더 목록 구성
  const cached = getCachedMe();
  const allFolders: DiaryFolder[] = mergeFolders(
    (cached?.folders ?? []) as DiaryFolder[],
    cached?.hidden_folders ?? []
  );
  const currentFolder = allFolders.find((f) => f.id === folder);

  function handleEdit() {
    navigation.navigate('DiaryWrite', { entry });
  }

  // 시트를 열 때 현재 entry·groups 기준으로 선택을 다시 시드
  // (useState 초기화 시점엔 groups가 아직 로드 전이라 '전체 공개' 글이 빈 선택으로 시작해
  //  그대로 저장하면 비공개로 바뀌는 사고가 났었다)
  function openShare() {
    if (entry.visibility === 'friends') {
      setSelectedGroups(new Set(
        entry.sharedGroups && entry.sharedGroups.length ? entry.sharedGroups : groups.map((g) => g.id)
      ));
    } else {
      setSelectedGroups(new Set());
    }
    setShareOpen(true);
  }

  // 공유 대상 그룹 토글
  function toggleGroup(id: number) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // 선택된 그룹에만 공개 저장 (아무것도 안 고르면 비공개)
  function savePublish() {
    const ids = Array.from(selectedGroups);
    const next: 'private' | 'friends' = ids.length > 0 ? 'friends' : 'private';
    setPublishing(true);
    setPublished(ids.length > 0);
    updateEntry({ ...entry, visibility: next, sharedGroups: ids.length > 0 ? ids : null, aiComment, persona });
    setPublishing(false);
    setShareOpen(false);
    notify(ids.length > 0 ? `${ids.length} 개 그룹에 공개했어요.` : '비공개로 전환했어요.');
  }

  // AI 코멘트 즉시 생성 (24 시간 기다리지 않고 미리 받아보기)
  async function handleGenerateComment() {
    setGenLoading(true);
    try {
      const updated = await generateComment(entry.id, persona);
      setAiComment(updated.aiComment);
      updateLocal(updated); // 목록에도 반영
    } catch (e: any) {
      notify(e?.message ?? 'AI 코멘트 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setGenLoading(false);
    }
  }

  // 코멘트 페르소나(말투) 변경 → 이미 코멘트가 있으면 새 말투로 즉시 다시 생성
  async function handleChangePersona(next: string) {
    setPersonaOpen(false);
    if (next === persona) return;
    const prev = persona;
    setPersona(next);
    if (!aiComment) return; // 아직 코멘트가 없으면 다음 생성 때 이 페르소나가 쓰임
    setGenLoading(true);
    try {
      const updated = await generateComment(entry.id, next);
      setAiComment(updated.aiComment);
      updateLocal(updated); // 목록에도 반영
    } catch (e: any) {
      notify(e?.message ?? 'AI 코멘트 생성에 실패했어요. 잠시 후 다시 시도해주세요.');
      setPersona(prev); // 실패 시 원래 페르소나로 롤백
    } finally {
      setGenLoading(false);
    }
  }

  // 이 글을 폴더에 넣기/이동 (낙관적 반영 + 서버 저장)
  function handleChangeFolder(id: string) {
    setFolderOpen(false);
    if (id === folder) return;
    setFolder(id);
    updateEntry({ ...entry, folder: id, aiComment, persona, visibility: published ? 'friends' : 'private' });
    const name = allFolders.find((f) => f.id === id)?.name ?? '폴더';
    notify(`'${name}' 폴더에 넣었어요.`);
  }

  /** 부적절한 AI 코멘트 신고 (앱스토어 AI 콘텐츠 심사 대응) — 확인 후 접수 */
  const [reportConfirmOpen, setReportConfirmOpen] = useState(false);

  async function reportAiComment() {
    setReportConfirmOpen(false);
    try {
      await reportContent('ai_comment', entry.id);
      notify('신고가 접수되었어요. 검토 후 조치할게요.');
    } catch (e: any) {
      notify(e?.message ?? '신고 접수에 실패했어요.');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconChev dir="left" size={18} color="#9ca3af" />
          <Text style={styles.backText}>목록</Text>
        </TouchableOpacity>
        {isMine ? (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.shareIconBtn, { backgroundColor: accent }]} onPress={openShare}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <Path d="M16 6l-4-4-4 4" />
                <Line x1="12" y1="2" x2="12" y2="15" />
              </Svg>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleEdit}>
              <IconEdit size={16} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setDeleteOpen(true)}>
              <IconTrash size={16} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.readOnlyBadge}>{entry.author ? `${entry.author} 님의 p!ng` : '멤버의 p!ng'}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>{entryDateLabel(entry)}</Text>
        <Text style={styles.title}>{entry.title}</Text>

        {gallery.length > 0 && (
          <>
            <TouchableOpacity style={styles.photoWrapper} activeOpacity={0.9} onPress={() => setLightboxPhoto(gallery[0])}>
              <AspectPhoto photo={gallery[0]} minRatio={1} />
            </TouchableOpacity>
            {gallery.length > 1 && (
              <View style={styles.galleryRow}>
                {gallery.slice(1).map((p) => (
                  <TouchableOpacity key={p} onPress={() => setLightboxPhoto(p)}>
                    <Image source={{ uri: p }} style={styles.galleryThumb} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        <View style={styles.meta}>
          {entry.tags.map((t) => <Tag key={t} label={t} />)}
        </View>

        {isMine && (
          <TouchableOpacity style={styles.folderChip} onPress={() => setFolderOpen(true)}>
            <IconFolder size={13} color={accent} />
            <Text style={styles.folderChipText}>
              {currentFolder ? currentFolder.name : '폴더에 넣기'}
            </Text>
            <IconChev dir="down" size={12} color="#9ca3af" />
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        {/* 오늘의 질문 (질문에 답한 일기) */}
        {question && (
          <View style={[styles.questionCard, { backgroundColor: hexToRgba(accent, 0.08), borderColor: hexToRgba(accent, 0.25) }]}>
            <Text style={[styles.questionQ, { color: accent }]}>Q</Text>
            <Text style={styles.questionText}>{question}</Text>
          </View>
        )}

        {/* 본문 — [photo:URL] 마커 자리에 사진이 글 중간에 렌더됨 */}
        {parseBodySegments(bodyText).map((seg, i) =>
          seg.type === 'text' ? (
            <Text key={i} style={styles.body}>{seg.text}</Text>
          ) : (
            <TouchableOpacity key={i} style={styles.photoWrapper} activeOpacity={0.9} onPress={() => setLightboxPhoto(seg.url)}>
              <AspectPhoto photo={seg.url} minRatio={1} />
            </TouchableOpacity>
          )
        )}

        {/* AI 코멘트 */}
        <View style={styles.aiSection}>
          <View style={styles.aiTitleRow}>
            <IconSparkle size={15} color={accent} />
            <TouchableOpacity
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={() => { if (aiComment) { animateLayout(); setAiOpen((v) => !v); } }}
              activeOpacity={aiComment ? 0.7 : 1}
            >
              <Text style={styles.aiTitle}>AI 코멘트</Text>
              {aiComment && (
                <Text style={[styles.aiToggle, { color: accent }]}>{aiOpen ? '접기 ∧' : '펼치기 ∨'}</Text>
              )}
            </TouchableOpacity>
            {isMine ? (
              <TouchableOpacity
                style={styles.aiPersonaBtn}
                onPress={() => setPersonaOpen(true)}
                disabled={genLoading}
              >
                <PersonaIcon persona={persona} size={13} color={accent} />
                <Text style={[styles.aiPersona, { color: accent }]}>{persona}</Text>
                <IconChev dir="down" size={12} color={accent} />
              </TouchableOpacity>
            ) : (
              <View style={styles.aiPersonaRow}>
                <PersonaIcon persona={persona} size={13} color="#9ca3af" />
                <Text style={styles.aiPersona}>{persona}</Text>
              </View>
            )}
          </View>

          {aiComment ? (
            aiOpen &&
            <View style={styles.aiCommentBox}>
              {genLoading ? (
                <View style={styles.aiRegenRow}>
                  <ActivityIndicator color={accent} size="small" />
                  <Text style={styles.aiRegenText}>{persona} 말투로 코멘트를 다시 쓰고 있어요…</Text>
                </View>
              ) : (
                <Text style={styles.aiCommentText}>{aiComment}</Text>
              )}
              <TouchableOpacity style={styles.aiReportBtn} onPress={() => setReportConfirmOpen(true)}>
                <Text style={styles.aiReportText}>부적절한 코멘트인가요? 신고하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.aiLockedBox}>
              {isUnlocked ? <IconSparkle size={26} color={accent} /> : <IconLock size={26} color="#9ca3af" />}
              <Text style={styles.aiLockedText}>
                {isUnlocked ? '아직 코멘트가 없어요' : 'p!ng 작성 10 시간 후 공개돼요'}
              </Text>
              {!isUnlocked && <Text style={styles.aiCountdown}>{formatRemaining(remaining)}</Text>}
              {isMine && (
                <TouchableOpacity
                  style={[styles.genBtn, { backgroundColor: accent }, genLoading && { opacity: 0.6 }]}
                  onPress={handleGenerateComment}
                  disabled={genLoading}
                >
                  {genLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.genBtnText}>{isUnlocked ? '지금 코멘트 받기' : '지금 미리 받기'}</Text>}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {shareOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setShareOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>그룹에 공유</Text>
              <TouchableOpacity onPress={() => setShareOpen(false)}>
                <IconX size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              {groups.length === 0
                ? '아직 참여 중인 그룹이 없어요. 그룹을 만들거나 참여해보세요.'
                : '공개할 그룹을 골라주세요. 아무것도 고르지 않으면 비공개예요.'}
            </Text>
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {groups.map((g) => {
                const active = selectedGroups.has(g.id);
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.shareGroupRow, active && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                    onPress={() => toggleGroup(g.id)}
                  >
                    <Text style={[styles.shareGroupName, active && { color: accent, fontWeight: '600' }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <View style={[styles.shareCheck, active && { borderColor: accent, backgroundColor: accent }]}>
                      {active && <Text style={styles.shareCheckMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accent }]}
              onPress={savePublish}
              disabled={publishing}
            >
              <Text style={[styles.confirmBtnText, { color: '#fff' }]}>
                {selectedGroups.size > 0 ? `${selectedGroups.size} 개 그룹에 공개` : '비공개로 저장'}
              </Text>
            </TouchableOpacity>
          </View>
        </SheetWrap>
      )}

      {personaOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setPersonaOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>코멘트 말투 바꾸기</Text>
              <TouchableOpacity onPress={() => setPersonaOpen(false)}>
                <IconX size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>
              {aiComment ? '고르면 그 말투로 코멘트를 다시 써줘요.' : '어떤 말투로 코멘트를 받을까요?'}
            </Text>
            {PERSONAS.map((p) => {
              const active = p.label === persona;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.personaRow, active && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                  onPress={() => handleChangePersona(p.label)}
                >
                  <PersonaIcon persona={p.label} size={18} color={active ? accent : '#6b7280'} />
                  <Text style={[styles.personaLabel, active && { color: accent, fontWeight: '600' }]}>{p.label}</Text>
                  {active && <Text style={[styles.personaCheck, { color: accent }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </SheetWrap>
      )}

      {folderOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setFolderOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>폴더에 넣기</Text>
              <TouchableOpacity onPress={() => setFolderOpen(false)}>
                <IconX size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSub}>이 글을 어떤 폴더에 넣을까요?</Text>
            <ScrollView style={styles.folderList} showsVerticalScrollIndicator={false}>
              {allFolders.map((f) => {
                const active = f.id === folder;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.personaRow, active && { borderColor: accent, backgroundColor: hexToRgba(accent, 0.08) }]}
                    onPress={() => handleChangeFolder(f.id)}
                  >
                    <Text style={styles.folderEmoji}>{f.emoji}</Text>
                    <Text style={[styles.personaLabel, active && { color: accent, fontWeight: '600' }]}>{f.name}</Text>
                    {active && <Text style={[styles.personaCheck, { color: accent }]}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </SheetWrap>
      )}

      {reportConfirmOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setReportConfirmOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.deleteContent}>
              <Text style={styles.deleteTitle}>이 AI 코멘트를 신고할까요?</Text>
              <Text style={styles.deleteSub}>운영팀에 접수되고, 검토 후 조치돼요</Text>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={reportAiComment}>
                <Text style={styles.deleteConfirmText}>신고하기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setReportConfirmOpen(false)}>
                <Text style={styles.deleteCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SheetWrap>
      )}

      {deleteOpen && (
        <SheetWrap style={styles.overlayWrap}>
          <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={() => setDeleteOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.deleteContent}>
              <IconTrashLine size={30} color="#ef4444" />
              <Text style={styles.deleteTitle}>p!ng를 삭제할까요?</Text>
              <Text style={styles.deleteSub}>삭제하면 되돌릴 수 없어요</Text>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={() => { deleteEntry(entry.id); navigation.goBack(); }}
              >
                <Text style={styles.deleteConfirmText}>삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeleteOpen(false)}>
                <Text style={styles.deleteCancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SheetWrap>
      )}

      {lightboxPhoto && (
        <PhotoLightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}
    </SafeAreaView>
  );
}

const lightStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 13, color: '#6b7280' },
  actions: { flexDirection: 'row', gap: 8 },
  readOnlyBadge: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 24, gap: 14, paddingBottom: 48 },
  date: { fontSize: 12, color: '#9ca3af' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', lineHeight: 30, letterSpacing: -0.3 },
  photoWrapper: { borderRadius: 16, overflow: 'hidden' },
  galleryRow: { flexDirection: 'row', gap: 8 },
  galleryThumb: { width: 64, height: 64, borderRadius: 12 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  body: { fontSize: 15, color: '#374151', lineHeight: 26 },
  questionCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  questionQ: { fontSize: 15, fontWeight: '700' },
  questionText: { flex: 1, fontSize: 13.5, color: '#374151', lineHeight: 20, fontWeight: '600' },

  aiSection: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#111827',
    alignItems: 'center', justifyContent: 'center',
  },
  aiDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ffffff' },
  aiTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  aiToggle: { fontSize: 11.5, fontWeight: '600' },
  aiPersona: { fontSize: 12, color: '#9ca3af' },
  aiPersonaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aiPersonaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  aiRegenRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  aiRegenText: { fontSize: 13, color: '#9ca3af', flex: 1 },
  personaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  personaLabel: { fontSize: 14, color: '#374151', flex: 1 },
  personaCheck: { fontSize: 15, fontWeight: '700' },
  folderChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  folderChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  folderList: { maxHeight: 320 },
  folderEmoji: { fontSize: 18, width: 22, textAlign: 'center' },
  aiCommentBox: {
    backgroundColor: '#f9fafb', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 16,
  },
  aiCommentText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  aiReportBtn: { marginTop: 10, alignSelf: 'flex-end' },
  aiReportText: { fontSize: 11.5, color: '#9ca3af', textDecorationLine: 'underline' },
  aiLockedBox: {
    backgroundColor: '#f9fafb', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed',
    padding: 20, alignItems: 'center', gap: 6,
  },
  aiLockedEmoji: { fontSize: 28 },
  aiLockedText: { fontSize: 13, color: '#9ca3af' },
  aiCountdown: { fontSize: 20, fontWeight: '700', color: '#374151', letterSpacing: 2 },
  genBtn: { marginTop: 8, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center' },
  genBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  shareIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  overlayWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  overlayBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 32,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  sheetTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  sheetClose: { fontSize: 16, color: '#9ca3af' },
  sheetSub: { fontSize: 12.5, color: '#9ca3af', letterSpacing: -0.1, lineHeight: 19, marginBottom: 14 },

  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  groupEmoji: { fontSize: 22 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  groupMembers: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { fontSize: 12, color: '#fff', fontWeight: '600' },

  confirmBtn: {
    marginTop: 8, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '600' },

  // 공유 그룹 선택
  shareGroupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#f3f4f6',
    marginBottom: 8,
  },
  shareGroupName: { flex: 1, fontSize: 14, color: '#374151' },
  shareCheck: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#d1d5db',
    alignItems: 'center', justifyContent: 'center',
  },
  shareCheckMark: { fontSize: 12, color: '#fff', fontWeight: '700' },

  deleteContent: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  deleteEmoji: { fontSize: 36, marginBottom: 4 },
  deleteTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  deleteSub: { fontSize: 13, color: '#9ca3af', marginBottom: 8 },
  deleteConfirmBtn: {
    width: '100%', backgroundColor: '#ef4444', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  deleteConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  deleteCancelBtn: {
    width: '100%', backgroundColor: '#f3f4f6', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  deleteCancelText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});
