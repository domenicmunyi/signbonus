"use client";
// Signbonus — standalone signing-bonus vesting dApp. Clean light HR/offer-letter style. Self-contained.
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";

const K = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const CHAIN = 5042002, HEX = "0x4CEF52";
const ABI = [
  { name: "create", type: "function", stateMutability: "payable", inputs: [{ name: "beneficiary", type: "address" }, { name: "label", type: "string" }, { name: "cliffDays", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "claim", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "matured", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "get", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "grantor", type: "address" }, { name: "beneficiary", type: "address" }, { name: "label", type: "string" }, { name: "amount", type: "uint256" }, { name: "cliff", type: "uint256" }, { name: "claimed", type: "bool" }] }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "earnApyBps", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "earnDeposit", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "earnWithdraw", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "earnPrincipal", type: "function", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const m = (w?: bigint, d = 2) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const cut = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const isAddr = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);
async function toArc() { const e = (window as any).ethereum; if (!e) return; try { await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] }); } catch { try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX }] }); } catch {} } }

export default function App() {
  const { address, isConnected } = useAccount();
  const net = useChainId();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [pop, setPop] = useState(false);
  const [step, setStep] = useState<"offer" | "track" | "save">("offer");
  const [f, setF] = useState({ ben: "", label: "Signing bonus", cliff: "90", amt: "" });
  const [dep, setDep] = useState("");
  const w = useWriteContract();
  const rc = useWaitForTransactionReceipt({ hash: w.data, query: { enabled: !!w.data } });
  const busy = w.isPending || rc.isLoading;
  useEffect(() => { if (rc.isSuccess) { w.reset(); setF({ ben: "", label: "Signing bonus", cliff: "90", amt: "" }); setDep(""); } }, [rc.isSuccess]); // eslint-disable-line
  const total = useReadContract({ address: K, abi: ABI, functionName: "total" });
  const apy = useReadContract({ address: K, abi: ABI, functionName: "earnApyBps" });
  const prin = useReadContract({ address: K, abi: ABI, functionName: "earnPrincipal", args: address ? [address] : undefined, query: { enabled: !!address } });
  const n = total.data !== undefined ? Number(total.data) : 0;
  const wrong = isConnected && net !== CHAIN;
  const apyPct = apy.data === undefined ? "—" : (Number(apy.data) / 100).toFixed(1);
  const call = (fn: string, a: any[], v?: bigint) => w.writeContract({ address: K, abi: ABI, functionName: fn as any, args: a, value: v });

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf9", color: "#1b2a26", fontFamily: '"Inter","Segoe UI",sans-serif' }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 8vw", borderBottom: "1px solid #e6ece9", background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 34, height: 34, borderRadius: 9, background: "#0f766e", color: "#fff", display: "grid", placeItems: "center", fontSize: 17 }}>✍️</span><b style={{ fontSize: 19, letterSpacing: "-.01em" }}>Signbonus</b></div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {wrong && <button onClick={toArc} style={{ background: "#dc2626", color: "#fff", border: 0, padding: "8px 13px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Switch to Arc</button>}
          <div style={{ position: "relative" }}>
            <button onClick={() => setPop(p => !p)} style={{ background: "#0f766e", color: "#fff", border: 0, padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{isConnected ? `${cut(address)} ▾` : "Connect wallet"}</button>
            {pop && <div style={{ position: "absolute", right: 0, top: "115%", background: "#fff", border: "1px solid #e6ece9", borderRadius: 10, padding: 6, minWidth: 190, zIndex: 20, boxShadow: "0 12px 30px rgba(15,118,110,.12)" }}>
              {isConnected ? <button onClick={() => { disconnect(); setPop(false); }} style={di("#dc2626")}>Disconnect</button> : connectors.map(c => <button key={c.uid} onClick={() => { connect({ connector: c }); setPop(false); }} style={di("#1b2a26")}>{c.name}</button>)}
            </div>}
          </div>
        </div>
      </header>

      <section style={{ maxWidth: 780, margin: "0 auto", padding: "44px 24px 18px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-.02em", margin: 0 }}>Signing bonuses that vest, on-chain.</h1>
        <p style={{ color: "#5e716b", fontSize: 16, marginTop: 12, maxWidth: 520 }}>Lock a bonus for a new hire, release it after the cliff. Fully escrowed in USDC, claimable by the beneficiary.</p>
        <div style={{ display: "flex", gap: 24, marginTop: 24, borderBottom: "1px solid #e6ece9" }}>
          {(["offer", "track", "save"] as const).map(k => <button key={k} onClick={() => setStep(k)} style={{ background: "none", border: 0, borderBottom: step === k ? "2px solid #0f766e" : "2px solid transparent", color: step === k ? "#0f766e" : "#8a9994", fontWeight: 600, fontSize: 14.5, padding: "0 0 12px", marginBottom: -1, cursor: "pointer" }}>{k === "offer" ? "New offer" : k === "track" ? `Offers (${n})` : `Vault ${apyPct}%`}</button>)}
        </div>
      </section>

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "8px 24px 70px" }}>
        {step === "offer" && <div style={card}>
          <Lab>Beneficiary (new hire) address</Lab><In v={f.ben} on={x => setF(s => ({ ...s, ben: x }))} ph="0x…" />
          <Lab>Label</Lab><In v={f.label} on={x => setF(s => ({ ...s, label: x }))} ph="Signing bonus" />
          <div style={{ display: "flex", gap: 14 }}><div style={{ flex: 1 }}><Lab>Cliff (days)</Lab><In v={f.cliff} on={x => setF(s => ({ ...s, cliff: x }))} ph="90" t="number" /></div><div style={{ flex: 1 }}><Lab>Amount (USDC)</Lab><In v={f.amt} on={x => setF(s => ({ ...s, amt: x }))} ph="0.00" t="number" /></div></div>
          <button disabled={!isConnected || busy || !isAddr(f.ben) || !(Number(f.amt) > 0)} onClick={() => call("create", [f.ben as `0x${string}`, f.label, BigInt(f.cliff || "0")], parseEther(f.amt || "0"))} style={cta(busy)}>{busy ? "Confirming…" : "Lock signing bonus ✍️"}</button>
        </div>}

        {step === "track" && <div style={{ display: "grid", gap: 12 }}>
          {n === 0 && <div style={{ ...card, textAlign: "center", color: "#8a9994" }}>No offers yet</div>}
          {Array.from({ length: n }, (_, i) => BigInt(n - 1 - i)).map(id => <Offer key={id.toString()} id={id} busy={busy} onClaim={() => call("claim", [id])} />)}
        </div>}

        {step === "save" && <div style={card}>
          <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>Park reserves at {apyPct}% APY</h3>
          <div style={{ color: "#5e716b", fontSize: 14, marginBottom: 14 }}>Principal <b style={{ color: "#0f766e" }}>${m(prin.data as bigint)}</b></div>
          <In v={dep} on={setDep} ph="USDC to deposit" t="number" />
          <div style={{ display: "flex", gap: 12 }}>
            <button disabled={!isConnected || busy || !(Number(dep) > 0)} onClick={() => call("earnDeposit", [], parseEther(dep || "0"))} style={cta(busy)}>{busy ? "…" : "Deposit"}</button>
            <button disabled={busy || !(prin.data && (prin.data as bigint) > 0n)} onClick={() => call("earnWithdraw", [])} style={{ ...cta(busy), background: "#fff", color: "#0f766e", border: "1px solid #0f766e" }}>Withdraw</button>
          </div>
        </div>}
      </main>
      <footer style={{ borderTop: "1px solid #e6ece9", padding: "20px 8vw", color: "#a7b3af", fontSize: 13, background: "#fff" }}>Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer" style={{ color: "#0f766e", textDecoration: "none" }}>Arc Network</a></footer>
    </div>
  );
}
function Offer({ id, busy, onClaim }: { id: bigint; busy: boolean; onClaim: () => void }) {
  const g = useReadContract({ address: K, abi: ABI, functionName: "get", args: [id] });
  const mat = useReadContract({ address: K, abi: ABI, functionName: "matured", args: [id] });
  if (!g.data) return null; const it = g.data as any; const ready = !!mat.data && !it.claimed;
  return (
    <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><div style={{ fontWeight: 600, fontSize: 15.5 }}>{it.label || `Offer #${id}`}</div><div style={{ color: "#8a9994", fontSize: 12.5, marginTop: 2 }}>{cut(it.beneficiary)} · cliff {Number(it.cliff)} days</div></div>
      <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, color: "#0f766e" }}>${m(it.amount)}</div>
        {it.claimed ? <span style={{ fontSize: 12, color: "#16a34a" }}>Released ✓</span> : <button disabled={busy || !ready} onClick={onClaim} style={{ marginTop: 4, background: ready ? "#0f766e" : "#eef2f1", color: ready ? "#fff" : "#8a9994", border: 0, padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: ready ? "pointer" : "not-allowed" }}>{ready ? "Claim" : "Vesting"}</button>}</div>
    </div>
  );
}
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e6ece9", borderRadius: 14, padding: "22px 24px", boxShadow: "0 4px 18px rgba(15,118,110,.04)" };
const cta = (d?: boolean): React.CSSProperties => ({ width: "100%", marginTop: 12, background: "#0f766e", color: "#fff", border: 0, borderRadius: 10, padding: "13px 0", fontSize: 15, fontWeight: 600, cursor: d ? "not-allowed" : "pointer", opacity: d ? .5 : 1 });
const Lab = ({ children }: { children: React.ReactNode }) => <label style={{ display: "block", fontSize: 13, color: "#5e716b", fontWeight: 500, margin: "8px 0 6px" }}>{children}</label>;
const In = ({ v, on, ph, t }: { v: string; on: (x: string) => void; ph: string; t?: string }) => <input value={v} onChange={e => on(e.target.value)} placeholder={ph} type={t || "text"} style={{ width: "100%", boxSizing: "border-box", background: "#f8faf9", border: "1px solid #d6e0dc", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", color: "#1b2a26" }} />;
const di = (color: string): React.CSSProperties => ({ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, padding: "9px 12px", borderRadius: 8, color, fontWeight: 600, fontSize: 13.5, cursor: "pointer" });
