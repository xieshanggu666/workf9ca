<script setup>
import { computed, ref } from 'vue'
import { useSkyStore } from '@/store/sky'
const store = useSkyStore()
const emit = defineEmits(['close'])
const slotIco = { '引擎': '🔩', '翼板': '🦅', '氮气': '💨', '龙骨': '⛓️', '护甲': '🛡️' }
const statName = { speed: '速度', turn: '转向', acc: '加速', dur: '耐久' }
const perfList = () => [
  ['speed', '速度'], ['turn', '转向'], ['acc', '加速'], ['dur', '耐久']
].map(([k, l]) => ({ k, l, v: store.airship[k] || 0 }))
// 已持有数量按服务端商品配置比对（名称/槽位/加成项/数值/价格），下单只传 id
const ownedCount = it => store.upgrades.filter(u =>
  u.name === it.name && u.slot === it.slot && u.stat === it.stat && u.bonus === it.bonus && u.price === it.price).length
async function buy(it) {
  const r = await store.shop(it.id)
  if (r?.ok) store.tip(r.msg || '购买成功')
}

/* ---------- 飞艇租赁 ---------- */
const rental = computed(() => store.rental)
const rules = computed(() => store.state?.rentalRules || { wearFree: 40 })
// 归还结算预估：与服务端 leaseSettlement 同口径（租约行快照 + 免赔额双倍计赔）
const preview = computed(() => {
  const rn = rental.value
  if (!rn) return null
  const wearLoss = 100 - rn.cond
  const wearFee = wearLoss * rn.wear_unit
  const penalty = Math.max(0, wearLoss - rules.value.wearFree) * rn.wear_unit
  return { wearLoss, wearFee, penalty, refund: rn.deposit - rn.rent - wearFee - penalty }
})
const returning = ref(false)
async function rent(ship) {
  const r = await store.rentShip(ship.id)
  if (r?.ok) store.tip(`「${ship.name}」已就位，租约 ${ship.races} 场`)
}
async function giveBack() {
  if (returning.value) return          // 防重复点击；服务端结算本身幂等
  returning.value = true
  await store.returnRental()
  returning.value = false
}
</script>

<template>
  <div class="drawer-mask" @click.self="emit('close')">
    <aside class="drawer">
      <header class="d-h">
        <div><h3>✈️ 机库 Hangar</h3><div class="d-sub">改装你的飞艇，招募机师技工</div></div>
        <button class="d-x" @click="emit('close')">✕</button>
      </header>

      <div class="d-body">
        <!-- 飞艇主展示（租赁期间展示出战机艇=租赁艇） -->
        <div class="airship-card">
          <div class="air-top">
            <div class="air-icon">🛸</div>
            <div>
              <b>{{ store.airship.name }}</b>
              <div class="air-tag tag" :class="rental ? 'o' : 'b'">
                {{ rental ? `租赁艇 · 剩余 ${rental.races_left} 场` : '主力飞艇' }}
              </div>
              <div v-if="rental" class="d-sub" style="margin-top:4px">自有艇「{{ store.state?.ownAirship?.name }}」停靠中</div>
            </div>
            <div class="air-health">
              <div class="ah-label">{{ rental ? '租赁艇况' : '部件健康' }} <span class="mono" :class="{ low: store.airship.parts_dur < 40 }">{{ store.airship.parts_dur }}%</span></div>
              <div class="hbar"><i :style="{ width: store.airship.parts_dur + '%', background: store.airship.parts_dur < 40 ? 'linear-gradient(90deg,var(--rose),var(--gold2))' : 'linear-gradient(90deg,var(--mint),var(--sky))' }"></i></div>
            </div>
          </div>
          <div class="perf-grid">
            <div v-for="p in perfList()" :key="p.k" class="perf">
              <span class="pl">{{ p.l }}</span>
              <div class="hbar"><i :style="{ width: Math.min(100, p.v) + '%' }"></i></div>
              <b class="mono">{{ p.v }}</b>
            </div>
          </div>
          <button class="btn mint w-full" :disabled="!!rental" :title="rental ? '租赁艇由出租方负责整备' : ''" @click="store.maintain()">
            🔧 {{ rental ? '租赁艇由出租方整备' : '维护部件' }}
          </button>
        </div>

        <!-- 飞艇租赁：赛前签约（扣押金）→ 租约场次内出战 → 归还按磨损结算 -->
        <section>
          <div class="sec-h">
            <b>🛟 飞艇租赁</b><span class="d-sub">押金签约 · 归还时按磨损结算</span>
          </div>

          <!-- 在租租约：租约条款、艇况与结算预估 -->
          <div v-if="rental" class="rental-active">
            <div class="ra-top">
              <b>{{ rental.name }}</b>
              <span class="tag o">租约 {{ rental.races_total }} 场 · 剩余 {{ rental.races_left }} 场</span>
            </div>
            <div class="ra-terms">
              押金 <b class="mono">¥{{ rental.deposit.toLocaleString() }}</b> ·
              租金 <b class="mono">¥{{ rental.rent.toLocaleString() }}</b> ·
              磨损赔偿 <b class="mono">¥{{ rental.wear_unit }}/点</b>（超 {{ rules.wearFree }} 点部分双倍）
            </div>
            <div v-if="preview" class="ra-settle">
              <div class="ra-row"><span>累计磨损</span><b class="mono" :class="{ low: preview.wearLoss > rules.wearFree }">{{ preview.wearLoss }} 点</b></div>
              <div class="ra-row"><span>磨损赔偿</span><b class="mono">-¥{{ preview.wearFee.toLocaleString() }}</b></div>
              <div v-if="preview.penalty" class="ra-row"><span>重度磨损附加</span><b class="mono low">-¥{{ preview.penalty.toLocaleString() }}</b></div>
              <div class="ra-row total">
                <span>预计归还{{ preview.refund >= 0 ? '净退' : '需补差价' }}</span>
                <b class="mono" :class="preview.refund >= 0 ? 'ok' : 'low'">{{ preview.refund >= 0 ? '+' : '' }}¥{{ preview.refund.toLocaleString() }}</b>
              </div>
            </div>
            <button class="btn primary w-full" :disabled="returning" @click="giveBack">
              🔙 {{ returning ? '结算中…' : '归还飞艇并结算' }}
            </button>
            <div v-if="!rental.races_left" class="ra-warn">租约场次已用完，归还后才能继续参赛</div>
          </div>

          <!-- 租赁市场：无在租租约时可签约 -->
          <div v-else class="up-grid">
            <div v-for="ship in store.rentalMarket" :key="ship.id" class="up-card">
              <div class="up-name">{{ ship.name }} <span class="tag v sm-tag">{{ ship.tag }}</span></div>
              <div class="rt-stats">
                <span>速 {{ ship.speed }}</span><span>转 {{ ship.turn }}</span>
                <span>加 {{ ship.acc }}</span><span>耐 {{ ship.dur }}</span>
              </div>
              <div class="rt-terms">押金 ¥{{ ship.deposit.toLocaleString() }} · 租金 ¥{{ ship.rent.toLocaleString() }} · {{ ship.races }} 场</div>
              <button class="btn sm primary" :disabled="store.team.money < ship.deposit" @click="rent(ship)">
                {{ store.team.money < ship.deposit ? '押金不足' : `签约（押金 ¥${ship.deposit.toLocaleString()}）` }}
              </button>
            </div>
          </div>

          <!-- 最近归还结算记录 -->
          <div v-if="store.rentalHistory.length" class="rt-history">
            <div v-for="h in store.rentalHistory" :key="h.id" class="rt-his-row">
              <span>🔙 {{ h.name }} · 磨损 {{ h.wear }} 点</span>
              <b class="mono" :class="h.refund >= 0 ? 'ok' : 'low'">{{ h.refund >= 0 ? '退 ¥' : '补 ¥' }}{{ Math.abs(h.refund).toLocaleString() }}</b>
            </div>
          </div>
        </section>

        <!-- 改装件道具（租赁期间锁定：改装件属于自有艇，对租赁艇不生效） -->
        <section>
          <div class="sec-h">
            <b>🧩 改装件</b><span class="d-sub">{{ rental ? '租赁期间改装间锁定' : '点击装备 / 卸下' }}</span>
          </div>
          <div class="up-grid">
            <div v-for="u in store.upgrades" :key="u.id" class="up-card" :class="{ eq: u.equipped }">
              <div class="up-ico">{{ slotIco[u.slot] }}</div>
              <div class="up-name">{{ u.name }}</div>
              <div class="up-stat">+{{ u.bonus }} {{ statName[u.stat] }}</div>
              <button class="btn sm" :class="u.equipped ? 'ghost' : 'primary'" :disabled="!!rental" @click="u.equipped ? store.unequip(u.id) : store.equip(u.id)">
                {{ u.equipped ? '卸下' : '装备' }}
              </button>
            </div>
          </div>
        </section>

        <!-- 零件商店：价格与属性均来自服务端商品配置，点击即按 id 下单 -->
        <section>
          <div class="sec-h">
            <b>🛒 零件商店</b><span class="d-sub">标价与性能由工坊核定，童叟无欺</span>
          </div>
          <div class="up-grid">
            <div v-for="it in store.shop" :key="it.id" class="up-card">
              <div class="up-ico">{{ slotIco[it.slot] }}</div>
              <div class="up-name">{{ it.name }}</div>
              <div class="up-stat">+{{ it.bonus }} {{ statName[it.stat] }}</div>
              <button class="btn sm primary" :disabled="store.team.money < it.price" @click="buy(it)">
                ¥{{ it.price.toLocaleString() }}<template v-if="ownedCount(it)"> · 已购{{ ownedCount(it) }}</template>
              </button>
            </div>
          </div>
        </section>

        <!-- 机师 -->
        <section>
          <div class="sec-h">
            <b>🧑‍✈️ 机师</b>
            <button class="btn ghost sm" @click="store.hirePilot()">＋ 招募 ¥1500</button>
          </div>
          <div class="crew-list">
            <div v-for="p in store.state?.pilots || []" :key="p.id" class="crew-row">
              <div class="crew-ava" :style="{ background: 'linear-gradient(135deg,var(--gold2),var(--violet))' }">{{ p.name[0] }}</div>
              <div class="crew-m">
                <div class="cm-name">{{ p.name }}<span class="tag b sm-tag">技巧{{ p.skill }}</span></div>
                <div class="cm-sub">胆识 {{ p.courage }} · 经验 {{ p.exp }} · 心情 {{ p.mood }}</div>
              </div>
              <button class="btn ghost sm" @click="store.train(p.id)">🎓</button>
            </div>
          </div>
        </section>

        <!-- 技工 -->
        <section>
          <div class="sec-h">
            <b>🔧 技工</b>
            <button class="btn ghost sm" @click="store.hireMech()">＋ 招募 ¥1000</button>
          </div>
          <div class="crew-list">
            <div v-for="m in store.state?.mechanics || []" :key="m.id" class="crew-row">
              <div class="crew-ava" style="background:linear-gradient(135deg,var(--mint),var(--sky))">{{ m.name[0] }}</div>
              <div class="crew-m">
                <div class="cm-name">{{ m.name }}<span class="tag m sm-tag">技能{{ m.skill }}</span></div>
                <div class="cm-sub">心情 {{ m.mood }}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </aside>
  </div>
</template>