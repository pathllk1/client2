<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits(['close'])

const rawText = ref('')
const previewMode = ref<'text' | 'markdown'>('text')

const charCount = computed(() => rawText.value.length)
const wordCount = computed(() => {
  const text = rawText.value.trim()
  return text ? text.split(/\s+/).length : 0
})
const lineCount = computed(() => {
  return rawText.value ? rawText.value.split(/\n/).length : 0
})

const handleCasing = (type: 'upper' | 'lower' | 'title' | 'snake') => {
  const text = rawText.value
  if (!text) return

  if (type === 'upper') {
    rawText.value = text.toUpperCase()
  } else if (type === 'lower') {
    rawText.value = text.toLowerCase()
  } else if (type === 'title') {
    rawText.value = text.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    })
  } else if (type === 'snake') {
    rawText.value = text
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w_]+/g, '')
  }
}

const cleanSpaces = () => {
  if (!rawText.value) return
  rawText.value = rawText.value.replace(/\s+/g, ' ').trim()
}

const cleanNewlines = () => {
  if (!rawText.value) return
  rawText.value = rawText.value.replace(/\n+/g, '\n').trim()
}

const rot13 = () => {
  const text = rawText.value
  if (!text) return
  rawText.value = text.replace(/[a-zA-Z]/g, (c) => {
    const code = c.charCodeAt(0)
    const base = code <= 90 ? 65 : 97
    return String.fromCharCode(((code - base + 13) % 26) + base)
  })
}

const base64Encode = () => {
  try {
    rawText.value = btoa(unescape(encodeURIComponent(rawText.value)))
  } catch (e) {
    alert('Failed to encode base64: invalid characters')
  }
}

const base64Decode = () => {
  try {
    rawText.value = decodeURIComponent(escape(atob(rawText.value)))
  } catch (e) {
    alert('Failed to decode base64: invalid input format')
  }
}

const copyToClipboard = () => {
  navigator.clipboard.writeText(rawText.value)
}

const clearText = () => {
  rawText.value = ''
}

const markdownPreviewHtml = computed(() => {
  const text = rawText.value
  if (!text) return '<p class="text-slate-600 italic">Preview markdown formatting here...</p>'

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-black text-white mt-4 mb-2">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-black text-white mt-5 mb-3">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-white mt-6 mb-4">$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong class="font-black text-white">$1</strong>')

  // Italics
  html = html.replace(/\*(.*)\*/gim, '<em class="italic text-slate-300">$1</em>')

  // Code Block
  html = html.replace(/```([\s\S]*?)```/gim, '<pre class="bg-slate-950 border border-slate-800 p-4 rounded-xl text-slate-200 font-mono text-xs my-3 whitespace-pre-wrap overflow-x-auto">$1</pre>')

  // Inline Code
  html = html.replace(/`(.*?)`/gim, '<code class="bg-slate-950 text-rose-400 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-800">$1</code>')

  // Line breaks
  html = html.replace(/\n/g, '<br>')

  return html
})
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" style="z-index: 100000;">
    <div
      class="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
    >
      <!-- Header -->
      <div class="border-b border-slate-800 p-6 flex justify-between items-center bg-slate-950/40 shrink-0">
        <div>
          <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Text utility studio</p>
          <h2 class="text-2xl font-black text-white mt-0.5 tracking-tight italic">Text Studio & Markdown</h2>
        </div>
        <button
          type="button"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <!-- Action Toolbar -->
      <div class="px-6 py-3 bg-slate-950/20 border-b border-slate-800/80 flex flex-wrap gap-2 items-center shrink-0">
        <div class="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800/60 rounded-xl">
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="handleCasing('upper')">UPPER</button>
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="handleCasing('lower')">lower</button>
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="handleCasing('title')">Title Case</button>
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="handleCasing('snake')">snake_case</button>
        </div>

        <div class="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800/60 rounded-xl">
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="cleanSpaces" title="Convert multiple spaces to single space">Clean Spaces</button>
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="cleanNewlines" title="Remove empty lines">Clean Lines</button>
        </div>

        <div class="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800/60 rounded-xl">
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="rot13">ROT13</button>
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="base64Encode">B64 Encode</button>
          <button type="button" class="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white hover:bg-slate-800 cursor-pointer" @click="base64Decode">B64 Decode</button>
        </div>

        <button
          type="button"
          class="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest transition cursor-pointer"
          @click="copyToClipboard"
        >
          Copy output
        </button>
        <button
          type="button"
          class="bg-rose-950/20 hover:bg-rose-900 border border-rose-950/40 text-rose-500 text-[10px] px-4 py-2 rounded-xl font-black uppercase tracking-widest transition cursor-pointer"
          @click="clearText"
        >
          Clear
        </button>
      </div>

      <!-- Main Layout -->
      <div class="flex-1 flex overflow-hidden min-h-0 bg-slate-900">
        <!-- Raw Text Editor (Left) -->
        <div class="flex-1 flex flex-col min-w-0 border-r border-slate-800">
          <div class="px-4 py-2 bg-slate-950/30 border-b border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
            Source Text Input
          </div>
          <textarea
            v-model="rawText"
            class="flex-1 bg-transparent border-0 px-6 py-6 text-slate-300 text-sm leading-relaxed focus:outline-none resize-none font-mono placeholder:text-slate-700"
            placeholder="Type or paste text here..."
          ></textarea>
        </div>

        <!-- Formatting Output Panel (Right) -->
        <div class="flex-1 flex flex-col min-w-0">
          <div class="px-4 py-1.5 bg-slate-950/30 border-b border-slate-800 flex justify-between items-center shrink-0">
            <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Preview</span>
            <div class="flex p-0.5 bg-slate-950 border border-slate-800/80 rounded-lg">
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
                :class="[previewMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-500']"
                @click="previewMode = 'text'"
              >
                Text
              </button>
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer"
                :class="[previewMode === 'markdown' ? 'bg-indigo-600 text-white' : 'text-slate-500']"
                @click="previewMode = 'markdown'"
              >
                Markdown
              </button>
            </div>
          </div>

          <!-- Preview Content -->
          <div class="flex-1 p-6 overflow-y-auto font-mono text-sm text-slate-300">
            <div v-if="previewMode === 'text'" class="whitespace-pre-wrap break-all select-all selection:bg-indigo-500/30">
              {{ rawText || 'Processed output text will display here...' }}
            </div>
            <div v-else class="prose prose-invert max-w-none text-slate-300 select-all" v-html="markdownPreviewHtml"></div>
          </div>
        </div>
      </div>

      <!-- Footer stats -->
      <div class="px-6 py-3 bg-slate-950 border-t border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest shrink-0 flex gap-6">
        <span>Characters: <strong class="text-slate-300">{{ charCount }}</strong></span>
        <span>Words: <strong class="text-slate-300">{{ wordCount }}</strong></span>
        <span>Lines: <strong class="text-slate-300">{{ lineCount }}</strong></span>
      </div>
    </div>
  </div>
</template>
