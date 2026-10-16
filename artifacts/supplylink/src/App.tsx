import { createContext, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  useCreateOrder, useCreateProduct, useDeleteProduct, useGetDashboardSummary, useGetMe,
  useGetMessageThreads, useGetMessages, useGetOrders, useGetProducts, useHealthCheck, useLogin,
  useRegister, useSendMessage, useUpdateOrderStatus, useUpdateProduct,
  getGetDashboardSummaryQueryKey, getGetMeQueryKey, getGetMessageThreadsQueryKey,
  getGetMessagesQueryKey, getGetOrdersQueryKey, getGetProductsQueryKey,
  setAuthTokenGetter,
} from '@workspace/api-client-react';
import type { MessageThread, Order, Product, ProductInput, ProductUpdate, User } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2, ChevronRight, Leaf, LogOut,
  MapPin, Menu, MessageCircle, Minus, Package, Plus, Search, Send, ShoppingBag,
  ShoppingBasket, ShoppingCart, Sprout, Star, Truck, UserRound, X,
} from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { OrderInputOrderType, OrderStatusInputStatus, RegisterInputRole } from '@workspace/api-client-react';

type CartRow = { product: Product; quantity: number };
type AuthContextValue = { user: User | null; setUser: (user: User | null) => void; logout: () => void };
const AuthContext = createContext<AuthContextValue | null>(null);
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1 } } });

const getStoredUser = (): User | null => {
  try { const stored = localStorage.getItem('supplylink-user'); return stored ? JSON.parse(stored) as User : null; }
  catch { return null; }
};
setAuthTokenGetter(() => localStorage.getItem('supplylink-token'));

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(getStoredUser);
  const client = useQueryClient();
  const setUser = (next: User | null) => {
    setUserState(next);
    if (next) localStorage.setItem('supplylink-user', JSON.stringify(next));
    else localStorage.removeItem('supplylink-user');
  };
  const logout = () => {
    localStorage.removeItem('supplylink-token');
    localStorage.removeItem('supplylink-user');
    setUserState(null);
    client.clear();
  };
  const me = useGetMe({ query: { enabled: !!localStorage.getItem('supplylink-token'), queryKey: getGetMeQueryKey(), retry: false } });
  useEffect(() => { if (me.data) setUserState(me.data); }, [me.data]);
  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}

function AppRouter() {
  const [path] = useLocation();
  return <div className="grain min-h-[100dvh]">
    {path !== '/login' && path !== '/register' && <TopNav />}
    <div className={path === '/login' || path === '/register' ? '' : 'pt-[78px]'}>
      <ErrorBoundary resetKey={path}>
        <Switch>
          <Route path="/" component={Marketplace} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/orders" component={OrdersPage} />
          <Route path="/messages" component={MessagesPage} />
          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </div>
    {path !== '/login' && path !== '/register' && <Footer />}
  </div>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><AuthProvider><AppRouter /></AuthProvider></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

const navLinks = [
  { href: '/', label: 'Marketplace', icon: ShoppingBasket },
  { href: '/dashboard', label: 'Producer desk', icon: BarChart3 },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
];

function TopNav() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return <header className="fixed z-40 top-0 inset-x-0 bg-[#f7f4eb]/95 backdrop-blur-md border-b border-[#ded9cc]">
    <div className="max-w-[1440px] mx-auto px-5 lg:px-10 h-[78px] flex items-center justify-between gap-6">
      <Link href="/" className="flex items-center gap-3 group" data-testid="link-brand">
        <span className="w-10 h-10 rounded-xl bg-[#20313a] text-[#efbd59] flex items-center justify-center transition-transform group-hover:-rotate-6"><Sprout size={22}/></span>
        <span><span className="block font-serif font-extrabold tracking-[-.06em] text-[21px] leading-5 text-[#20313a]">supplylink</span><span className="font-mono text-[9px] uppercase tracking-[.18em] text-[#668073]">good food, close by</span></span>
      </Link>
      <nav className="hidden md:flex gap-1 items-center bg-[#eeeadf] rounded-full p-1" aria-label="Main navigation">
        {navLinks.map(({ href, label }) => <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} className={`nav-link rounded-full px-4 py-2 text-[13px] font-semibold ${location === href ? 'bg-[#fffdf7] text-[#347653] shadow-sm' : 'text-[#697570] hover:text-[#20313a]'}`}>{label}</Link>)}
      </nav>
      <div className="flex items-center gap-2">
        {user ? <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hidden sm:flex items-center gap-2 rounded-full border border-[#ddd8cc] px-3 py-2 hover:border-[#347653]" data-testid="link-account">
            <span className="w-7 h-7 rounded-full bg-[#dce9dc] text-[#347653] flex items-center justify-center text-[11px] font-bold">{user.name.slice(0,1).toUpperCase()}</span><span className="text-[13px] font-semibold text-[#20313a] max-w-24 truncate">{user.name.split(' ')[0]}</span>
          </Link>
          <button onClick={() => { logout(); setLocation('/'); }} className="hidden sm:flex text-[#76817b] hover:text-[#20313a] p-2" aria-label="Sign out" data-testid="button-logout"><LogOut size={17}/></button>
        </div> : <>
          <Link href="/login" className="hidden sm:block text-[13px] font-semibold px-3 py-2 text-[#4e6258] hover:text-[#20313a]" data-testid="link-login">Sign in</Link>
          <Link href="/register" className="rounded-full px-4 sm:px-5 py-2.5 bg-[#347653] text-white text-[13px] font-bold hover:bg-[#286344] transition-colors" data-testid="link-join">Join SupplyLink</Link>
        </>}
        <button className="md:hidden p-2 text-[#20313a]" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation" data-testid="button-mobile-menu">{mobileOpen ? <X size={20}/> : <Menu size={20}/>}</button>
      </div>
    </div>
    {mobileOpen && <div className="md:hidden border-t border-[#ded9cc] p-3 grid grid-cols-2 gap-2 bg-[#f7f4eb]">
      {navLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-3 text-sm font-semibold text-[#344b40]" data-testid={`mobile-nav-${label}`}><Icon size={16}/>{label}</Link>)}
      {user ? <button onClick={() => { logout(); setLocation('/'); setMobileOpen(false); }} className="col-span-2 text-center py-2 text-[#9b5546] font-bold" data-testid="mobile-logout">Sign out of {user.name.split(' ')[0]}</button> : <Link href="/login" className="col-span-2 text-center py-2 text-[#347653] font-bold" data-testid="mobile-login">Sign in</Link>}
    </div>}
  </header>;
}

function Footer() {
  const health = useHealthCheck();
  return <footer className="border-t border-[#ded9cc] mt-20 bg-[#efede4]">
    <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-2"><Sprout size={18} className="text-[#347653]"/><span className="font-serif font-extrabold text-[#20313a]">supplylink</span><span className="text-xs text-[#8b928a] ml-2">A shorter route from soil to table.</span></div>
      <div className="flex items-center gap-4"><span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.12em] text-[#78867b]" data-testid="status-market-api"><span className={`w-1.5 h-1.5 rounded-full ${health.data?.status === 'ok' ? 'bg-[#4e9364]' : health.isError ? 'bg-[#c56c4e]' : 'bg-[#d8a942]'}`}/>{health.data?.status === 'ok' ? 'Market connected' : health.isError ? 'Market connection paused' : 'Connecting to market'}</span><span className="font-mono text-[10px] uppercase tracking-[.12em] text-[#879087]">Local first · Fair by design · 2025</span></div>
    </div>
  </footer>;
}

function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-8">
    <div><div className="font-mono uppercase text-[10px] tracking-[.2em] text-[#558269] mb-2">{eyebrow}</div><h1 className="font-serif font-extrabold text-[34px] sm:text-[42px] tracking-[-.045em] text-[#20313a] leading-tight">{title}</h1><p className="mt-2 text-sm text-[#738077]">{subtitle}</p></div>{action}
  </div>;
}

function LoadingBlock({ label = 'Gathering the latest from your network…' }: { label?: string }) {
  return <div className="rounded-2xl bg-[#eeeadf] p-8" aria-label="Loading">
    <div className="h-4 w-36 bg-[#d9d4c8] rounded animate-pulse mb-4"/><div className="h-3 w-2/3 bg-[#dfdbd0] rounded animate-pulse"/><p className="mt-5 text-xs text-[#79857b]">{label}</p>
  </div>;
}
function ErrorBlock({ message, retry }: { message: string; retry: () => void }) {
  return <div className="rounded-2xl border border-[#e8c9b7] bg-[#fff6ef] p-6 flex items-center justify-between gap-4"><div><p className="font-bold text-[#8e4d36]">We couldn't load this just now.</p><p className="text-sm text-[#8b7164] mt-1">{message}</p></div><button className="text-sm font-bold text-[#347653] underline underline-offset-4" onClick={retry} data-testid="button-retry">Try again</button></div>;
}

function Marketplace() {
  const [mode, setMode] = useState<'WHOLESALE' | 'RETAIL'>('RETAIL');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All goods');
  const [organic, setOrganic] = useState(false);
  const [cart, setCart] = useState<CartRow[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const client = useQueryClient();
  useEffect(() => { if (!user) { setCart([]); setCartOpen(false); } }, [user]);
  const params = useMemo(() => ({ ...(search.trim() ? { search: search.trim() } : {}), ...(category !== 'All goods' ? { category } : {}), mode, ...(organic ? { organic: true } : {}) }), [search, category, mode, organic]);
  const products = useGetProducts(params);
  const createOrder = useCreateOrder();
  const productList = (products.data ?? []).filter((product) => product.isActive);
  const itemCount = cart.reduce((sum, row) => sum + row.quantity, 0);
  const total = cart.reduce((sum, row) => sum + priceFor(row.product, mode) * row.quantity, 0);
  const categories = ['All goods', ...Array.from(new Set(productList.map((p) => p.category))).sort()];
  const addToCart = (product: Product) => {
    setCart((old) => {
      const found = old.find((row) => row.product.id === product.id);
      if (found) return old.map((row) => row.product.id === product.id ? { ...row, quantity: Math.min(row.quantity + 1, product.stockQuantity) } : row);
      return [...old, { product, quantity: mode === 'WHOLESALE' ? Math.min(product.moq, product.stockQuantity) : 1 }];
    });
    setCartOpen(true);
  };
  const updateQuantity = (id: string, amount: number) => setCart((old) => old.flatMap((row) => {
    if (row.product.id !== id) return [row];
    if (amount < 0 && (row.quantity <= 1 || (mode === 'WHOLESALE' && row.quantity <= row.product.moq))) return [];
    return [{ ...row, quantity: Math.min(row.product.stockQuantity, row.quantity + amount) }];
  }));
  const checkout = (event: FormEvent) => {
    event.preventDefault();
    if (!user) { setLocation('/login'); return; }
    if (!cart.length) return;
    setOrderMessage('');
    createOrder.mutate({ data: { orderType: OrderInputOrderType[mode], deliveryAddress: deliveryAddress || user.address || user.city, items: cart.map((row) => ({ productId: row.product.id, quantity: row.quantity })) } }, {
      onSuccess: () => {
        setCart([]); setCheckoutOpen(false); setCartOpen(false); setOrderMessage('Your order is confirmed. The producer will be in touch shortly.');
        void client.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        void client.invalidateQueries({ queryKey: getGetProductsQueryKey() });
      },
    });
  };
  return <main className="page-enter">
    <section className="max-w-[1440px] mx-auto px-5 lg:px-10 pt-7 pb-10">
      <div className="relative overflow-hidden rounded-[28px] bg-[#20313a] min-h-[350px] md:min-h-[405px] px-7 md:px-14 py-10 md:py-14 flex items-center">
        <div className="absolute top-0 right-0 w-[58%] h-full opacity-80 hero-orbit" aria-hidden="true"><div className="absolute right-[7%] top-[9%] w-[300px] h-[300px] rounded-full border border-[#b4c99b]/30"/><div className="absolute right-[14%] top-[16%] w-[230px] h-[230px] rounded-full border border-[#edb74b]/35"/><div className="absolute right-[20%] top-[24%] w-[154px] h-[154px] rounded-full bg-[#367c57]/60"/><div className="absolute right-[27%] top-[32%] w-[82px] h-[82px] rounded-full bg-[#edb74b] shadow-[0_20px_55px_rgba(237,183,75,.16)]"/><div className="absolute right-[7%] bottom-[13%] w-[180px] h-[90px] border border-[#b4c99b]/35 rounded-[50%] rotate-[-24deg]"/><div className="absolute right-[31%] bottom-[16%] font-mono text-[9px] uppercase tracking-[.18em] text-[#aab8a7]">harvest route 04 — live</div></div>
        <div className="absolute right-[11%] top-[16%] text-[#a9c4a7] hidden sm:block"><Sprout size={36} strokeWidth={1}/></div>
        <div className="relative z-10 max-w-[600px]">
          <div className="inline-flex gap-2 items-center rounded-full border border-[#577064] px-3 py-1.5 text-[#d5dfd0] font-mono text-[10px] tracking-[.13em] uppercase"><span className="w-1.5 h-1.5 rounded-full bg-[#edb74b]"/> Food with a shorter journey</div>
          <h1 className="mt-6 text-[#f6f3e8] font-serif font-extrabold leading-[.98] tracking-[-.055em] text-[46px] sm:text-[60px] lg:text-[68px]">Good things<br/><span className="text-[#efbd59]">grow nearby.</span></h1>
          <p className="mt-5 max-w-[440px] text-[#bdc9c0] leading-relaxed text-[15px]">Shop straight from the hands that grow, raise and make your food. A better market for every link in the chain.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#market" className="inline-flex items-center gap-2 rounded-full bg-[#efbd59] px-5 py-3 text-[#20313a] text-sm font-bold hover:bg-[#f5c96f] transition-colors" data-testid="button-explore-market">Explore the market <ArrowRight size={16}/></a>
            <span className="inline-flex items-center gap-2 text-[#cbd7cd] text-xs pl-2"><MapPin size={14} className="text-[#81aa7c]"/> Sourced close to home</span>
          </div>
        </div>
        <div className="hidden lg:block absolute bottom-8 left-1/2 -translate-x-1/2 text-[9px] tracking-[.22em] font-mono text-[#93a39a] uppercase">soil → hands → table</div>
      </div>
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['01', 'Direct from source'], ['02', 'Fairer farmgate'], ['03', 'Fresh by design'], ['04', 'Your local loop']].map(([n, label]) => <div key={n} className="rounded-xl bg-[#eeeae0] px-4 py-3 flex items-center gap-3"><span className="font-mono text-[10px] text-[#ad8b3b]">{n}</span><span className="text-xs font-semibold text-[#4b6055]">{label}</span></div>)}
      </div>
    </section>

    <section id="market" className="max-w-[1440px] mx-auto px-5 lg:px-10 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
        <div><div className="font-mono uppercase text-[10px] tracking-[.2em] text-[#558269] mb-2">The neighborhood market</div><h2 className="font-serif text-[34px] sm:text-[40px] font-extrabold tracking-[-.05em] text-[#20313a]">Fresh from the source<span className="text-[#d19e37]">.</span></h2><p className="text-sm text-[#78837b] mt-2">Meet the people behind the good stuff.</p></div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 bg-[#e9e5da] rounded-full p-1">
            {(['RETAIL', 'WHOLESALE'] as const).map((value) => <button key={value} onClick={() => setMode(value)} className={`rounded-full px-4 py-2 text-[11px] font-bold tracking-[.08em] transition-colors ${mode === value ? 'bg-[#347653] text-white shadow-sm' : 'text-[#64746b] hover:text-[#20313a]'}`} data-testid={`button-mode-${value.toLowerCase()}`}>{value === 'RETAIL' ? 'For the table' : 'For business'}</button>)}
          </div>
          <button onClick={() => setCartOpen(true)} className="relative inline-flex items-center gap-2 rounded-full bg-[#20313a] text-[#f8f5eb] px-4 py-2.5 text-xs font-bold hover:bg-[#2b414c]" data-testid="button-open-cart"><ShoppingCart size={15}/> Basket <span className="min-w-5 h-5 rounded-full bg-[#efbd59] text-[#20313a] grid place-items-center text-[10px]">{itemCount}</span></button>
        </div>
      </div>
      <div className="flex flex-col xl:flex-row gap-3 mb-7">
        <label className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#869188]"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Try tomatoes, sourdough, orchard…" className="w-full h-12 rounded-xl bg-[#fffdf7] border border-[#e0dccf] pl-11 pr-4 text-sm outline-none focus:border-[#72a581] focus:ring-2 focus:ring-[#347653]/10" data-testid="input-product-search"/></label>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-xl px-4 h-12 text-xs font-semibold border transition-colors ${category === item ? 'bg-[#dce9dc] border-[#a9c7aa] text-[#347653]' : 'bg-[#fffdf7] border-[#e0dccf] text-[#69756d] hover:border-[#a9c7aa]'}`} data-testid={`filter-category-${item.toLowerCase().replaceAll(' ', '-')}`}>{item}</button>)}
        </div>
        <button onClick={() => setOrganic(!organic)} className={`h-12 px-4 rounded-xl border inline-flex items-center gap-2 text-xs font-bold ${organic ? 'bg-[#dce9dc] text-[#347653] border-[#a9c7aa]' : 'bg-[#fffdf7] text-[#69756d] border-[#e0dccf]'}`} data-testid="filter-organic"><Leaf size={15}/> Organic</button>
      </div>
      {orderMessage && <div className="mb-5 p-4 rounded-xl bg-[#dce9dc] text-[#286344] text-sm font-semibold flex gap-2 items-center" role="status" data-testid="status-order-success"><CheckCircle2 size={18}/>{orderMessage}</div>}
      {products.isLoading ? <ProductSkeleton/> : products.isError ? <ErrorBlock message="Market listings are having a moment." retry={() => void products.refetch()}/> : productList.length === 0 ? <EmptyMarket search={search} clear={() => { setSearch(''); setCategory('All goods'); setOrganic(false); }}/> :
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-6">
          {productList.map((product, i) => <ProductCard key={product.id} product={product} mode={mode} delay={i} onAdd={() => addToCart(product)} onMessage={() => user ? setLocation('/messages') : setLocation('/login')}/>)}
        </div>}
      <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-[#e8eee3] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4"><div className="w-10 h-10 shrink-0 grid place-items-center bg-[#347653] text-white rounded-full"><Sprout size={19}/></div><div><p className="font-serif font-extrabold text-xl tracking-[-.03em] text-[#20313a]">Make your next good thing local.</p><p className="text-sm text-[#6e7f70] mt-1">Are you growing, making or raising something nearby?</p></div></div>
        <Link href="/register" className="shrink-0 rounded-full border border-[#9ab79c] text-[#347653] px-5 py-3 text-xs font-bold hover:bg-white/60 transition-colors" data-testid="link-become-producer">Bring your harvest <ArrowRight size={14} className="inline ml-1"/></Link>
      </div>
    </section>
    {cartOpen && <CartPanel cart={cart} mode={mode} total={total} updateQuantity={updateQuantity} onClose={() => setCartOpen(false)} onCheckout={() => { if (!cart.length) return; setDeliveryAddress(user?.address ?? ''); setCheckoutOpen(true); }}/>}
    {checkoutOpen && <Modal title="A good thing is on its way." onClose={() => setCheckoutOpen(false)}><form onSubmit={checkout} className="space-y-4">
      <p className="text-sm text-[#748178]">Check your basket and add a drop-off address. The producer will confirm the details.</p>
      <div className="rounded-xl bg-[#f2efe6] p-4 space-y-2">{cart.map((row) => <div key={row.product.id} className="flex justify-between text-sm"><span>{row.quantity} × {row.product.title}</span><b>{money(priceFor(row.product, mode) * row.quantity)}</b></div>)}<div className="border-t border-[#ded9cc] pt-2 flex justify-between font-bold"><span>Total</span><span>{money(total)}</span></div></div>
      <label className="block text-xs font-bold text-[#55665b]">Delivery address<input required minLength={3} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} className="field mt-2" placeholder="Street, town or pickup point" data-testid="input-delivery-address"/></label>
      {!user && <p className="text-xs text-[#b36d3b]">Sign in to place your order.</p>}
       {createOrder.isError && <p className="text-sm text-[#a04437]" role="alert" data-testid="error-checkout">{createOrder.error instanceof Error ? createOrder.error.message : 'Order could not be placed. Please try again.'}</p>}
      <button className="primary-button w-full" disabled={createOrder.isPending} data-testid="button-submit-order">{createOrder.isPending ? 'Placing your order…' : `Place order · ${money(total)}`}</button>
    </form></Modal>}
  </main>;
}

function priceFor(product: Product, mode: 'RETAIL' | 'WHOLESALE') { return mode === 'WHOLESALE' ? product.wholesalePrice : product.retailPrice; }
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value); }

function ProductCard({ product, mode, delay, onAdd, onMessage }: { product: Product; mode: 'RETAIL' | 'WHOLESALE'; delay: number; onAdd: () => void; onMessage: () => void }) {
  const price = priceFor(product, mode);
  return <article className="product-card rounded-[20px] overflow-hidden bg-[#fffdf7] border border-[#e4dfd3] group" data-testid={`card-product-${product.id}`} style={{ animationDelay: `${delay * 40}ms` }}>
    <div className="relative h-[220px] overflow-hidden bg-[#e6e8d9]">
      {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" data-testid={`img-product-${product.id}`}/> :
        <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ background: colorFor(product.category) }}><div className="absolute w-48 h-48 rounded-full border border-white/25 -right-4 -top-10"/><div className="absolute w-28 h-28 rounded-full border border-white/25 -left-5 -bottom-8"/><div className="relative text-white/80"><Sprout size={48} strokeWidth={1}/></div><span className="absolute left-4 bottom-4 font-mono uppercase tracking-[.15em] text-white/70 text-[9px]">{product.category}</span></div>}
      <div className="absolute top-3 left-3 flex gap-2">{product.isOrganic && <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f5e9]/95 text-[#347653] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.08em]"><Leaf size={11}/> Organic</span>}</div>
      <span className="absolute top-3 right-3 rounded-full bg-[#20313a]/85 text-white px-2.5 py-1 text-[9px] font-mono">{product.stockQuantity} {product.unit} available</span>
    </div>
    <div className="p-5">
      <div className="flex justify-between items-start gap-3"><div><div className="text-[10px] uppercase tracking-[.14em] text-[#819086] font-mono">{product.category}</div><h3 className="mt-1 font-serif font-extrabold text-[21px] leading-tight tracking-[-.035em] text-[#20313a]" data-testid={`text-product-title-${product.id}`}>{product.title}</h3></div><div className="flex items-center gap-1 text-[#a67d28] text-xs pt-1"><Star size={12} fill="currentColor"/><span className="font-bold">{product.producerRating.toFixed(1)}</span></div></div>
      <p className="mt-2 text-[12px] leading-relaxed text-[#7a857c] line-clamp-2 min-h-[36px]">{product.description}</p>
      <div className="mt-4 pt-4 border-t border-[#eee9de] flex items-center justify-between">
        <div><div className="font-serif text-[24px] tracking-[-.04em] font-extrabold text-[#347653]">{money(price)}<span className="font-sans text-xs text-[#78847b] font-medium tracking-normal"> / {product.unit}</span></div><div className="mt-1 text-[10px] text-[#879087] flex items-center gap-1"><MapPin size={10}/>{product.producerName} · {product.producerCity}</div></div>
        <button onClick={onAdd} disabled={product.stockQuantity < 1 || (mode === 'WHOLESALE' && product.stockQuantity < product.moq)} className="h-10 w-10 rounded-full bg-[#20313a] text-[#f7f4eb] grid place-items-center hover:bg-[#347653] hover:rotate-3 transition-all disabled:opacity-40" aria-label={`Add ${product.title} to basket`} data-testid={`button-add-product-${product.id}`}><Plus size={18}/></button>
      </div>
      {mode === 'WHOLESALE' && <div className="mt-3 text-[10px] font-mono text-[#9a7840] flex items-center gap-1"><Package size={11}/> Minimum order {product.moq} {product.unit}</div>}
      <button onClick={onMessage} className="mt-3 text-[10px] font-bold text-[#789080] hover:text-[#347653] underline underline-offset-4" data-testid={`button-message-producer-${product.id}`}>Ask the producer</button>
    </div>
  </article>;
}
function colorFor(category: string) { const palette = ['#779575', '#d6a958', '#788995', '#b88168', '#7b947c']; const index = Array.from(category).reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length; return `linear-gradient(135deg, ${palette[index]}, #20313a)`; }
function ProductSkeleton() { return <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{[0,1,2].map((n) => <div key={n} className="rounded-[20px] bg-[#fffdf7] border border-[#e4dfd3] overflow-hidden"><div className="h-[220px] bg-[#e6e2d8] animate-pulse"/><div className="p-5 space-y-3"><div className="h-4 w-20 bg-[#e8e4d9] animate-pulse rounded"/><div className="h-6 w-3/4 bg-[#e8e4d9] animate-pulse rounded"/><div className="h-4 w-full bg-[#e8e4d9] animate-pulse rounded"/></div></div>)}</div>; }
function EmptyMarket({ search, clear }: { search: string; clear: () => void }) { return <div className="text-center rounded-[24px] border border-dashed border-[#c9c6b7] py-16 px-6 bg-[#f0ede4]"><div className="mx-auto w-14 h-14 rounded-full bg-[#dce9dc] text-[#347653] grid place-items-center"><ShoppingBasket size={24}/></div><h3 className="mt-4 font-serif font-extrabold text-2xl text-[#20313a]">{search ? 'Nothing in the crates yet.' : 'The market is between harvests.'}</h3><p className="mt-2 text-sm text-[#7d887e]">Try a different search or check back as local producers add their next batch.</p><button onClick={clear} className="mt-5 text-sm font-bold text-[#347653] underline underline-offset-4" data-testid="button-clear-filters">Clear filters</button></div>; }

function CartPanel({ cart, mode, total, updateQuantity, onClose, onCheckout }: { cart: CartRow[]; mode: 'RETAIL' | 'WHOLESALE'; total: number; updateQuantity: (id: string, amount: number) => void; onClose: () => void; onCheckout: () => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end">
    <button className="absolute inset-0 bg-[#18252a]/45 backdrop-blur-[2px]" onClick={onClose} aria-label="Close basket" data-testid="button-close-cart-backdrop"/>
    <aside className="relative w-full max-w-[440px] bg-[#f7f4eb] h-full shadow-2xl p-5 sm:p-7 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center border-b border-[#ddd8cc] pb-5"><div><div className="font-mono uppercase text-[9px] tracking-[.18em] text-[#6c8a72]">Your basket</div><h2 className="font-serif text-2xl font-extrabold tracking-[-.04em] text-[#20313a] mt-1">Good choices.</h2></div><button onClick={onClose} className="p-2 rounded-full hover:bg-[#e9e5da]" aria-label="Close cart" data-testid="button-close-cart"><X size={19}/></button></div>
      {!cart.length ? <div className="flex-1 flex flex-col justify-center items-center text-center"><div className="w-16 h-16 rounded-full bg-[#e6eadc] text-[#6c8c71] grid place-items-center"><ShoppingCart size={26}/></div><p className="mt-4 font-serif font-bold text-xl text-[#20313a]">The basket is empty</p><p className="mt-2 text-sm text-[#7d887e]">A little local goodness belongs here.</p><button onClick={onClose} className="mt-5 text-[#347653] text-sm font-bold underline underline-offset-4" data-testid="button-continue-shopping">Keep exploring</button></div> : <>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">{cart.map(({ product, quantity }) => <div key={product.id} className="flex gap-4 py-3 border-b border-[#e2ddd1]" data-testid={`cart-row-${product.id}`}><div className="w-16 h-16 shrink-0 rounded-xl bg-[#dbe4d5] overflow-hidden">{product.imageUrl && <img src={product.imageUrl} alt="" className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><p className="font-bold text-sm text-[#20313a] truncate">{product.title}</p><p className="text-[11px] text-[#899188] mt-1">{money(priceFor(product, mode))} / {product.unit}</p><div className="mt-2 flex items-center gap-2"><button onClick={() => updateQuantity(product.id, -1)} className="w-6 h-6 rounded-full border border-[#d9d4c7] grid place-items-center" aria-label="Decrease quantity" data-testid={`button-cart-minus-${product.id}`}><Minus size={12}/></button><span className="font-mono text-xs w-5 text-center">{quantity}</span><button onClick={() => updateQuantity(product.id, 1)} className="w-6 h-6 rounded-full border border-[#d9d4c7] grid place-items-center" aria-label="Increase quantity" data-testid={`button-cart-plus-${product.id}`}><Plus size={12}/></button></div></div><b className="text-sm text-[#20313a]">{money(priceFor(product, mode) * quantity)}</b></div>)}</div>
        <div className="border-t border-[#ddd8cc] pt-5"><div className="flex justify-between text-sm text-[#647168]"><span>Subtotal</span><span>{money(total)}</span></div><p className="text-[10px] text-[#92988e] mt-2">Local delivery details are confirmed by the producer.</p><button onClick={onCheckout} className="primary-button w-full mt-5" data-testid="button-checkout">Continue to checkout <ArrowRight size={15}/></button></div>
      </>}
    </aside>
  </div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[60] p-4 bg-[#18252a]/50 backdrop-blur-sm flex items-center justify-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="w-full max-w-[520px] max-h-[90vh] overflow-auto rounded-[24px] bg-[#fffdf7] p-6 sm:p-8 shadow-2xl page-enter"><div className="flex justify-between items-start gap-4 mb-6"><h2 className="font-serif font-extrabold text-[26px] text-[#20313a] tracking-[-.04em]">{title}</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-[#eeeae0]" aria-label="Close dialog" data-testid="button-close-modal"><X size={18}/></button></div>{children}</section></div>;
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [location, setLocation] = useLocation();
  const { setUser } = useAuth();
  const login = useLogin();
  const handleLogin = (e: FormEvent) => { e.preventDefault(); setError(''); login.mutate({ data: { email, password } }, { onSuccess: (session) => { localStorage.setItem('supplylink-token', session.token); setUser(session.user); setLocation(session.user.role === 'PRODUCER' ? '/dashboard' : '/'); }, onError: () => setError('Those details did not match an account. Check them and try once more.') }); };
  const demos = [
    ['producer@farm.com', 'Producer', 'password123'], ['artisan@dairy.com', 'Artisan', 'password123'],
    ['retailer@freshmart.com', 'Retailer', 'password123'], ['customer@gmail.com', 'Household', 'password123'],
  ];
  return <AuthLayout mode="login">
    <div className="max-w-[440px]">
      <Link href="/" className="inline-flex items-center gap-2 text-[#728279] hover:text-[#347653] text-xs font-bold mb-8" data-testid="link-back-market"><ArrowLeft size={14}/> Back to the market</Link>
      <div className="font-mono uppercase tracking-[.2em] text-[10px] text-[#558269]">Welcome back</div>
      <h1 className="font-serif text-[42px] tracking-[-.05em] font-extrabold text-[#20313a] mt-2">Good to see you.</h1>
      <p className="text-sm text-[#7d887e] mt-2 mb-7">Your people and produce are right where you left them.</p>
      <form onSubmit={handleLogin} className="space-y-4">
        <Field label="Email address"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="you@example.com" data-testid="input-email"/></Field>
        <Field label="Password"><input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="field" placeholder="At least 8 characters" data-testid="input-password"/></Field>
        {error && <p className="text-sm text-[#a04437]" role="alert" data-testid="error-login">{error}</p>}
        <button className="primary-button w-full mt-2" disabled={login.isPending} data-testid="button-sign-in">{login.isPending ? 'Opening your account…' : 'Sign in'} <ArrowRight size={15}/></button>
      </form>
      <div className="mt-7 border-t border-[#e5e0d4] pt-5"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#929a90] mb-3">Take a look around with a demo account</p>
        <div className="grid grid-cols-2 gap-2">{demos.map(([demoEmail, label, demoPassword]) => <button key={demoEmail} onClick={() => login.mutate({ data: { email: demoEmail, password: demoPassword } }, { onSuccess: (session) => { localStorage.setItem('supplylink-token', session.token); setUser(session.user); setLocation(session.user.role === 'PRODUCER' ? '/dashboard' : '/'); }, onError: () => setError('Demo sign-in is unavailable right now. Please try again.') })} className="rounded-xl border border-[#e3dfd3] bg-[#f7f4eb] px-3 py-3 text-left hover:border-[#9eb89f] transition-colors" data-testid={`button-demo-${label.toLowerCase()}`}><span className="block text-xs font-bold text-[#344d40]">{label}</span><span className="block text-[9px] text-[#8a938b] mt-1 truncate">{demoEmail}</span></button>)}</div>
      </div>
      <p className="mt-6 text-sm text-[#7e8980]">New to the neighborhood? <Link href="/register" className="font-bold text-[#347653] hover:underline" data-testid="link-register-from-login">Create an account</Link></p>
    </div>
  </AuthLayout>;
}

function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: RegisterInputRole.CUSTOMER as 'PRODUCER'|'RETAILER'|'CUSTOMER', phone: '', address: '', city: '', businessName: '', certifications: '' });
  const [error, setError] = useState('');
  const [location, setLocation] = useLocation();
  const { setUser } = useAuth();
  const register = useRegister();
  const set = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = (e: FormEvent) => {
    e.preventDefault(); setError('');
    register.mutate({ data: form }, { onSuccess: (session) => { localStorage.setItem('supplylink-token', session.token); setUser(session.user); setLocation(session.user.role === 'PRODUCER' ? '/dashboard' : '/'); }, onError: () => setError('We could not create your account. Please check each field and try again.') });
  };
  return <AuthLayout mode="register">
    <div className="max-w-[520px]">
      <Link href="/" className="inline-flex items-center gap-2 text-[#728279] hover:text-[#347653] text-xs font-bold mb-7" data-testid="link-back-market"><ArrowLeft size={14}/> Back to the market</Link>
      <div className="font-mono uppercase tracking-[.2em] text-[10px] text-[#558269]">Find your place in the loop</div>
      <h1 className="font-serif text-[38px] sm:text-[42px] tracking-[-.05em] font-extrabold text-[#20313a] mt-2">Make it local.</h1>
      <p className="text-sm text-[#7d887e] mt-2 mb-6">One account connects you to a better way to source.</p>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Your name"><input required minLength={2} value={form.name} onChange={(e) => set('name', e.target.value)} className="field" placeholder="Full name" data-testid="input-name"/></Field><Field label="Email address"><input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className="field" placeholder="you@example.com" data-testid="input-email"/></Field></div>
        <Field label="I am joining as"><div className="grid grid-cols-3 gap-2">{[['CUSTOMER','Household'],['RETAILER','Retailer'],['PRODUCER','Producer']].map(([role,label]) => <button type="button" key={role} onClick={() => setForm((old) => ({ ...old, role: role as typeof old.role }))} className={`rounded-xl border px-3 py-3 text-xs font-bold ${form.role === role ? 'bg-[#dce9dc] border-[#87ad8d] text-[#347653]' : 'bg-[#f7f4eb] border-[#e3dfd3] text-[#738078]'}`} data-testid={`button-role-${role.toLowerCase()}`}>{label}</button>)}</div></Field>
        {(form.role === 'RETAILER' || form.role === 'PRODUCER') && <Field label={form.role === 'PRODUCER' ? 'Farm or business name' : 'Business name'}><input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} className="field" placeholder="What should we call it?" data-testid="input-business-name"/></Field>}
        {form.role === 'PRODUCER' && <Field label="Certifications (optional)"><input value={form.certifications} onChange={(e) => set('certifications', e.target.value)} className="field" placeholder="Organic, regenerative…" data-testid="input-certifications"/></Field>}
        <div className="grid sm:grid-cols-2 gap-3"><Field label="Town or city"><input required minLength={2} value={form.city} onChange={(e) => set('city', e.target.value)} className="field" placeholder="Your town" data-testid="input-city"/></Field><Field label="Phone (optional)"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="field" placeholder="(555) 555-0123" data-testid="input-phone"/></Field></div>
        <Field label="Address"><input required minLength={3} value={form.address} onChange={(e) => set('address', e.target.value)} className="field" placeholder="Street or pickup address" data-testid="input-address"/></Field>
        <Field label="Password"><input required type="password" minLength={8} value={form.password} onChange={(e) => set('password', e.target.value)} className="field" placeholder="At least 8 characters" data-testid="input-password"/></Field>
        {error && <p className="text-sm text-[#a04437]" role="alert" data-testid="error-register">{error}</p>}
        <button className="primary-button w-full" disabled={register.isPending} data-testid="button-create-account">{register.isPending ? 'Setting up your place…' : 'Create your account'} <ArrowRight size={15}/></button>
      </form>
      <p className="mt-5 text-sm text-[#7e8980]">Already part of the market? <Link href="/login" className="font-bold text-[#347653] hover:underline" data-testid="link-login-from-register">Sign in</Link></p>
    </div>
  </AuthLayout>;
}

function AuthLayout({ children, mode }: { children: ReactNode; mode: string }) {
  return <main className="min-h-[100dvh] grid lg:grid-cols-[.92fr_1.08fr] bg-[#f7f4eb]">
    <section className="hidden lg:flex bg-[#20313a] relative overflow-hidden p-12 xl:p-16 flex-col justify-between text-[#f7f4eb]">
      <div className="absolute -right-24 top-28 w-[440px] h-[440px] rounded-full border border-[#9db49b]/20"/><div className="absolute right-0 top-52 w-[300px] h-[300px] rounded-full border border-[#edb74b]/25"/><div className="absolute right-28 top-[330px] w-28 h-28 rounded-full bg-[#347653]/70"/><div className="absolute right-52 top-[405px] w-12 h-12 rounded-full bg-[#edb74b]"/>
      <Link href="/" className="relative flex items-center gap-3" data-testid="link-brand-auth"><span className="w-10 h-10 rounded-xl bg-[#efbd59] text-[#20313a] grid place-items-center"><Sprout size={23}/></span><span className="font-serif font-extrabold text-2xl tracking-[-.05em]">supplylink</span></Link>
      <div className="relative max-w-[460px]"><div className="font-mono uppercase tracking-[.18em] text-[10px] text-[#b5c7ad]">{mode === 'login' ? 'A market that knows your name' : 'Start close to home'}</div><h2 className="mt-5 font-serif font-extrabold tracking-[-.055em] text-[58px] leading-[.98]">Better food.<br/><span className="text-[#efbd59]">Closer hands.</span></h2><p className="mt-6 max-w-[380px] text-[#b9c7be] leading-relaxed">A real connection between the people who grow good food and the people who bring it to the table.</p><div className="mt-9 flex items-center gap-3 text-xs text-[#d5ddd4]"><span className="flex -space-x-2">{['#efbd59','#8aa783','#c57f5e'].map((color, i) => <span key={color} className="w-8 h-8 rounded-full border-2 border-[#20313a] grid place-items-center text-[9px] font-bold text-[#20313a]" style={{backgroundColor:color}}>{['F','M','J'][i]}</span>)}</span><span>Rooted in the good things nearby.</span></div></div>
      <div className="relative flex justify-between font-mono text-[9px] tracking-[.16em] uppercase text-[#879b91]"><span>Direct · Local · Fair</span><span>SupplyLink / 01</span></div>
    </section>
    <section className="overflow-y-auto min-h-[100dvh] flex items-center justify-center px-5 py-10 sm:px-10"><div className="w-full max-w-[520px]">{children}</div></section>
  </main>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-[11px] font-bold tracking-[.03em] text-[#5c6c60]">{label}<div className="mt-2">{children}</div></label>; }

function DashboardPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const client = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState('');
  const products = useGetProducts();
  const summary = useGetDashboardSummary({ query: { enabled: !!user, queryKey: getGetDashboardSummaryQueryKey() } });
  const orders = useGetOrders({ query: { enabled: !!user, queryKey: getGetOrdersQueryKey() } });
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();
  const updateStatus = useUpdateOrderStatus();
  const ownProducts = (products.data ?? []).filter((product) => product.producerId === user?.id);
  const incoming = (orders.data ?? []).filter((order) => order.sellerId === user?.id && order.status !== 'DELIVERED' && order.status !== 'CANCELLED');
  if (!user) return <AuthRequired go={() => setLocation('/login')}/>;
  if (user.role !== 'PRODUCER') return <main className="page-enter max-w-5xl mx-auto px-5 py-16"><PageHeading eyebrow="Your SupplyLink" title={`Hello, ${user.name.split(' ')[0]}.`} subtitle="This desk is for producers. Browse the market or explore your recent orders."/><Link href="/" className="primary-button" data-testid="link-back-to-market">Go to the market <ArrowRight size={15}/></Link></main>;
  const refreshProducts = () => { void client.invalidateQueries({ queryKey: getGetProductsQueryKey() }); };
  const nextStatus: Record<string, typeof OrderStatusInputStatus[keyof typeof OrderStatusInputStatus]> = { PENDING: OrderStatusInputStatus.ACCEPTED, ACCEPTED: OrderStatusInputStatus.PROCESSING, PROCESSING: OrderStatusInputStatus.DISPATCHED, DISPATCHED: OrderStatusInputStatus.DELIVERED };
  const progressOrder = (order: Order) => updateStatus.mutate({ id: order.id, data: { status: nextStatus[order.status] } }, { onSuccess: () => { setFlash('Order progress updated.'); void client.invalidateQueries({ queryKey: getGetOrdersQueryKey() }); void client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } });
  const submitProduct = (data: ProductInput, id?: string) => {
    if (id) {
      const update: ProductUpdate = { title: data.title, description: data.description, retailPrice: data.retailPrice, wholesalePrice: data.wholesalePrice, stockQuantity: data.stockQuantity };
      updateProduct.mutate({ id, data: update }, { onSuccess: () => { setEditing(null); setFlash('Listing updated.'); refreshProducts(); } });
    }
    else createProduct.mutate({ data }, { onSuccess: () => { setAdding(false); setFlash('Your new listing is live.'); refreshProducts(); } });
  };
  const removeProduct = (product: Product) => { if (window.confirm(`Remove ${product.title} from your listings?`)) deleteProduct.mutate({ id: product.id }, { onSuccess: () => { setFlash('Listing removed.'); refreshProducts(); } }); };
  return <main className="page-enter max-w-[1440px] mx-auto px-5 lg:px-10 py-10">
    <PageHeading eyebrow={`${user.businessName || user.name} / producer desk`} title="Your growing business." subtitle="One clear view of what’s selling, what’s moving and what needs attention." action={<button onClick={() => setAdding(true)} className="primary-button" data-testid="button-add-listing"><Plus size={16}/> Add a listing</button>}/>
    {flash && <div role="status" className="mb-5 rounded-xl bg-[#dce9dc] text-[#286344] p-3 text-sm font-semibold flex justify-between" data-testid="status-dashboard-success">{flash}<button onClick={() => setFlash('')} aria-label="Dismiss" data-testid="button-dismiss-message"><X size={16}/></button></div>}
    {(products.isError || summary.isError || orders.isError) && <ErrorBlock message="Some of your desk data could not be loaded." retry={() => { void products.refetch(); void summary.refetch(); void orders.refetch(); }}/>}
    {(deleteProduct.isError || updateStatus.isError) && <p className="mb-4 rounded-xl bg-[#fff1e9] border border-[#efd3c5] px-4 py-3 text-sm text-[#9b5546]" role="alert" data-testid="error-dashboard-action">That change did not go through. Refresh and try again.</p>}
    {summary.isLoading ? <LoadingBlock label="Gathering your harvest report…"/> : <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-7 mt-4">
      <MetricCard label="Total revenue" value={money(summary.data?.revenue ?? 0)} hint="Revenue to date" icon={<ArrowUpRight size={16}/>} trend="month"/>
      <MetricCard label="Orders in motion" value={String(summary.data?.activeOrders ?? 0)} hint="Being prepared or delivered" icon={<Truck size={16}/>} />
      <MetricCard label="Open conversations" value={String(summary.data?.pendingInquiries ?? 0)} hint="Buyers waiting to hear back" icon={<MessageCircle size={16}/>} />
      <MetricCard label="Low on stock" value={String(summary.data?.lowStockCount ?? 0)} hint="Listings worth a look" icon={<Package size={16}/>} />
    </div>}
    <div className="grid lg:grid-cols-[1.35fr_.85fr] gap-5">
      <section className="rounded-[22px] bg-[#fffdf7] border border-[#e3dfd3] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-6"><div><div className="font-mono uppercase text-[9px] tracking-[.18em] text-[#75897a]">The season so far</div><h2 className="font-serif font-extrabold text-[24px] tracking-[-.04em] mt-1">Sales rhythm</h2></div><span className="text-[10px] rounded-full bg-[#e6eee0] text-[#47744e] px-3 py-1 font-bold">Monthly</span></div>
        {summary.isLoading ? <div className="h-48 bg-[#f0ede4] animate-pulse rounded-xl"/> : <SalesChart points={summary.data?.sales ?? []}/>}
      </section>
      <section className="rounded-[22px] bg-[#20313a] text-[#f7f4eb] p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-12 -top-20 rounded-full border border-[#a2b7a0]/20 w-56 h-56"/><div className="absolute right-5 top-9 rounded-full border border-[#edb74b]/20 w-36 h-36"/>
        <div className="relative"><div className="font-mono uppercase text-[9px] tracking-[.18em] text-[#b1c5ab]">Incoming orders</div><h2 className="font-serif font-extrabold text-[24px] tracking-[-.04em] mt-1 mb-5">Ready for your hands.</h2>
          {orders.isLoading ? <div className="h-32 bg-white/10 animate-pulse rounded-xl"/> : incoming.length ? <div className="space-y-3">{incoming.slice(0,3).map((order) => <div key={order.id} className="rounded-xl border border-white/15 p-3 bg-white/5" data-testid={`incoming-order-${order.id}`}><div className="flex justify-between gap-2"><div><div className="text-xs font-bold">{order.buyerName}</div><div className="text-[10px] text-[#adbbb1] mt-1">{order.items.map((item) => `${item.quantity} ${item.title}`).join(' · ')}</div></div><span className="text-xs font-mono text-[#efbd59]">{money(order.totalAmount)}</span></div><div className="mt-3 flex items-center justify-between"><StatusPill status={order.status}/><button onClick={() => progressOrder(order)} disabled={!nextStatus[order.status] || updateStatus.isPending} className="text-[10px] font-bold text-[#efbd59] hover:text-white" data-testid={`button-progress-order-${order.id}`}>{order.status === 'PENDING' ? 'Accept order' : order.status === 'DISPATCHED' ? 'Mark delivered' : 'Move forward'} <ChevronRight size={12} className="inline"/></button></div></div>)}</div> : <div className="rounded-xl border border-dashed border-white/20 p-5 text-sm text-[#b8c8be]">Nothing on the packing bench yet. New orders will show up here.</div>}
          <Link href="/orders" className="inline-flex mt-5 text-xs text-[#d9e1d9] font-semibold hover:text-[#efbd59]" data-testid="link-all-orders">View all orders <ArrowRight size={13} className="ml-1"/></Link>
        </div>
      </section>
    </div>
    <section className="mt-7">
      <div className="flex items-end justify-between mb-4"><div><div className="font-mono uppercase text-[9px] tracking-[.18em] text-[#75897a]">On your table</div><h2 className="font-serif font-extrabold text-[26px] tracking-[-.04em] mt-1">Your listings <span className="font-sans text-sm text-[#8a938a] font-medium">({ownProducts.length})</span></h2></div><button onClick={() => setAdding(true)} className="text-xs font-bold text-[#347653] hover:underline" data-testid="button-add-listing-inline">+ Add something</button></div>
       {products.isLoading ? <LoadingBlock label="Loading your listings…"/> : ownProducts.length ? <div className="rounded-[20px] overflow-hidden bg-[#fffdf7] border border-[#e3dfd3] divide-y divide-[#eee9df]">{ownProducts.map((product) => <div key={product.id} className="p-4 sm:px-5 flex items-center gap-3 sm:gap-4" data-testid={`row-listing-${product.id}`}><div className="w-12 h-12 rounded-xl overflow-hidden bg-[#e3e9da] shrink-0">{product.imageUrl && <img src={product.imageUrl} alt="" className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className="font-bold text-sm text-[#20313a] truncate">{product.title}</div><div className="text-[11px] text-[#8b948a] mt-1">{product.category} · {money(product.retailPrice)} / {product.unit}</div></div><span className={`hidden md:inline rounded-full px-2.5 py-1 text-[9px] font-bold ${product.isActive ? 'bg-[#e3efe0] text-[#347653]' : 'bg-[#ece9e0] text-[#7b817a]'}`}>{product.isActive ? 'Live' : 'Paused'}</span><div className={`hidden sm:block text-xs font-mono ${product.stockQuantity < 10 ? 'text-[#b87534]' : 'text-[#64796a]'}`}>{product.stockQuantity} {product.unit}</div><button onClick={() => updateProduct.mutate({ id: product.id, data: { isActive: !product.isActive } }, { onSuccess: () => { setFlash(product.isActive ? 'Listing paused.' : 'Listing is live again.'); refreshProducts(); } })} disabled={updateProduct.isPending} className="rounded-full border border-[#ddd8cb] px-3 py-2 text-[10px] font-bold text-[#52665a] hover:border-[#83a58c]" data-testid={`button-toggle-listing-${product.id}`}>{product.isActive ? 'Pause' : 'Resume'}</button><button onClick={() => setEditing(product)} className="rounded-full border border-[#ddd8cb] px-3 py-2 text-[10px] font-bold text-[#52665a] hover:border-[#83a58c]" data-testid={`button-edit-listing-${product.id}`}>Edit</button><button onClick={() => removeProduct(product)} className="p-2 text-[#a27566] hover:text-[#a04437]" aria-label={`Delete ${product.title}`} data-testid={`button-delete-listing-${product.id}`}><X size={16}/></button></div>)}</div> : <EmptyState title="Your first listing starts the loop." text="Add a product and nearby buyers can find it in the market." action={<button onClick={() => setAdding(true)} className="primary-button" data-testid="button-empty-add-listing"><Plus size={15}/> Add a listing</button>}/>}
    </section>
    {(adding || editing) && <ProductEditor product={editing ?? undefined} busy={createProduct.isPending || updateProduct.isPending} error={createProduct.isError || updateProduct.isError ? 'We could not save that listing. Please try again.' : ''} onClose={() => { setAdding(false); setEditing(null); }} onSubmit={(data) => submitProduct(data, editing?.id)}/>}
  </main>;
}

function MetricCard({ label, value, hint, icon, trend }: { label: string; value: string; hint: string; icon: ReactNode; trend?: string }) {
  return <div className="rounded-2xl bg-[#fffdf7] border border-[#e3dfd3] p-4 sm:p-5"><div className="flex justify-between items-start"><span className="text-[11px] font-semibold text-[#7c877e]">{label}</span><span className="w-8 h-8 rounded-lg bg-[#e5eee1] text-[#347653] grid place-items-center">{icon}</span></div><div className="font-serif text-[29px] sm:text-[34px] tracking-[-.05em] font-extrabold text-[#20313a] mt-3" data-testid={`metric-${label.toLowerCase().replaceAll(' ','-')}`}>{value}</div><div className="mt-1 text-[10px] text-[#9aa096]">{trend && <ArrowUpRight size={11} className="inline mr-1 text-[#4d8b61]"/>}{hint}</div></div>;
}
function SalesChart({ points }: { points: { month: string; sales: number }[] }) {
  const max = Math.max(1, ...points.map((point) => point.sales));
  if (!points.length) return <div className="h-48 flex flex-col items-center justify-center text-center rounded-xl bg-[#f4f1e8]"><BarChart3 size={24} className="text-[#91a18f]"/><p className="mt-3 text-sm font-semibold text-[#52655a]">Your first sale starts the chart.</p><p className="mt-1 text-xs text-[#8a948a]">Sales will appear here as orders are fulfilled.</p></div>;
  return <div className="h-48 flex items-end gap-2 sm:gap-4 border-b border-[#e7e2d7] px-1">{points.map((point, i) => <div key={`${point.month}-${i}`} className="flex-1 flex flex-col items-center justify-end h-full gap-2" data-testid={`bar-sales-${i}`}><span className="font-mono text-[9px] text-[#75847a]">{point.sales ? money(point.sales) : ''}</span><div className="w-full max-w-[44px] min-h-[3px] rounded-t-md transition-all" style={{ height: `${Math.max(3, (point.sales / max) * 115)}px`, background: i === points.length - 1 ? '#edb74b' : '#6f9c77' }}/><span className="font-mono text-[9px] text-[#879087]">{point.month}</span></div>)}</div>;
}
function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = { PENDING: 'bg-[#f6e8ca] text-[#9a6e22]', ACCEPTED: 'bg-[#e5eee1] text-[#47744e]', PROCESSING: 'bg-[#e0e9e9] text-[#557477]', DISPATCHED: 'bg-[#e0e7ef] text-[#526b88]', DELIVERED: 'bg-[#dce9dc] text-[#347653]', CANCELLED: 'bg-[#f1dfd8] text-[#9b5546]' };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.08em] ${colors[status] ?? 'bg-[#ece9e0] text-[#738078]'}`} data-testid={`status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}

function ProductEditor({ product, busy, error, onClose, onSubmit }: { product?: Product; busy: boolean; error: string; onClose: () => void; onSubmit: (data: ProductInput) => void }) {
  const [form, setForm] = useState<ProductInput>({ title: product?.title ?? '', description: product?.description ?? '', category: product?.category ?? 'Produce', unit: product?.unit ?? 'lb', retailPrice: product?.retailPrice ?? 0, wholesalePrice: product?.wholesalePrice ?? 0, moq: product?.moq ?? 1, stockQuantity: product?.stockQuantity ?? 0, imageUrl: product?.imageUrl ?? '', isOrganic: product?.isOrganic ?? false });
  const set = (key: keyof ProductInput, value: string | number | boolean) => setForm((old) => ({ ...old, [key]: value }));
  return <Modal title={product ? 'Tune your listing.' : 'Put it on the market.'} onClose={onClose}><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
    <Field label="Product name"><input required minLength={2} className="field" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="What are you growing or making?" data-testid="input-product-title"/></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Category"><input required className="field" value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Produce" data-testid="input-product-category"/></Field><Field label="Sold by"><input required className="field" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="bunch, lb, jar" data-testid="input-product-unit"/></Field></div>
    <Field label="A few details"><textarea className="field min-h-[76px] resize-y" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What makes this batch special?" data-testid="input-product-description"/></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Table price"><input required type="number" min="0" step=".01" className="field" value={form.retailPrice} onChange={(e) => set('retailPrice', Number(e.target.value))} data-testid="input-product-retail-price"/></Field><Field label="Business price"><input required type="number" min="0" step=".01" className="field" value={form.wholesalePrice} onChange={(e) => set('wholesalePrice', Number(e.target.value))} data-testid="input-product-wholesale-price"/></Field></div>
    <div className="grid grid-cols-2 gap-3"><Field label="Available quantity"><input required type="number" min="0" className="field" value={form.stockQuantity} onChange={(e) => set('stockQuantity', Number(e.target.value))} data-testid="input-product-stock"/></Field><Field label="Minimum business order"><input required type="number" min="1" className="field" value={form.moq} onChange={(e) => set('moq', Number(e.target.value))} data-testid="input-product-moq"/></Field></div>
    <Field label="Image URL (optional)"><input type="url" className="field" value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://" data-testid="input-product-image-url"/></Field>
    <label className="flex items-center gap-2 text-xs font-semibold text-[#5d6f61]"><input type="checkbox" checked={form.isOrganic} onChange={(e) => set('isOrganic', e.target.checked)} className="accent-[#347653]" data-testid="input-product-organic"/> Certified or grown organically</label>
    {error && <p className="text-sm text-[#a04437]" role="alert" data-testid="error-save-product">{error}</p>}
    <button className="primary-button w-full" disabled={busy} data-testid="button-save-product">{busy ? 'Saving your listing…' : product ? 'Save changes' : 'Publish listing'} <Check size={15}/></button>
  </form></Modal>;
}

function OrdersPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const orders = useGetOrders({ query: { enabled: !!user, queryKey: getGetOrdersQueryKey() } });
  const client = useQueryClient();
  const updateStatus = useUpdateOrderStatus();
  if (!user) return <AuthRequired go={() => setLocation('/login')}/>;
  const list = orders.data ?? [];
  const own = list.filter((order) => order.buyerId === user.id || order.sellerId === user.id).sort((a,b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const advance = (order: Order) => {
    const next: Record<string, typeof OrderStatusInputStatus[keyof typeof OrderStatusInputStatus]> = { PENDING: OrderStatusInputStatus.ACCEPTED, ACCEPTED: OrderStatusInputStatus.PROCESSING, PROCESSING: OrderStatusInputStatus.DISPATCHED, DISPATCHED: OrderStatusInputStatus.DELIVERED };
    const status = user.id === order.sellerId ? next[order.status] : order.status === 'PENDING' ? OrderStatusInputStatus.CANCELLED : undefined;
    if (!status) return;
    updateStatus.mutate({ id: order.id, data: { status } }, { onSuccess: () => { void client.invalidateQueries({ queryKey: getGetOrdersQueryKey() }); void client.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); } });
  };
  return <main className="page-enter max-w-[1180px] mx-auto px-5 lg:px-10 py-10">
    <PageHeading eyebrow="The whole route, in one place" title="Orders & handoffs." subtitle="Keep an eye on what’s arriving, what’s being packed and what’s already at the table." action={<Link href="/" className="secondary-button" data-testid="link-browse-market"><ShoppingBag size={15}/> Browse market</Link>}/>
    {updateStatus.isError && <p className="mb-4 rounded-xl bg-[#fff1e9] border border-[#efd3c5] px-4 py-3 text-sm text-[#9b5546]" role="alert" data-testid="error-update-order">That order update did not go through. Please try again.</p>}
    {orders.isLoading ? <LoadingBlock label="Following your orders…"/> : orders.isError ? <ErrorBlock message="Order history could not be loaded." retry={() => void orders.refetch()}/> : own.length ? <div className="space-y-4">{own.map((order) => <OrderCard key={order.id} order={order} currentUser={user} busy={updateStatus.isPending} onAdvance={() => advance(order)}/>)}</div> : <EmptyState title="Your order trail starts here." text="Browse the market and meet the people behind what you buy." action={<Link href="/" className="primary-button" data-testid="link-start-shopping">Explore local goods <ArrowRight size={15}/></Link>}/>}
  </main>;
}
function OrderCard({ order, currentUser, busy, onAdvance }: { order: Order; currentUser: User; busy: boolean; onAdvance: () => void }) {
  const isSeller = order.sellerId === currentUser.id;
  const flow = ['PENDING', 'ACCEPTED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'];
  const stage = flow.indexOf(order.status);
  const nextLabel: Record<string, string> = { PENDING: 'Accept order', ACCEPTED: 'Start preparing', PROCESSING: 'Mark dispatched', DISPATCHED: 'Mark delivered' };
  return <article className="rounded-[20px] bg-[#fffdf7] border border-[#e3dfd3] p-5 sm:p-6" data-testid={`card-order-${order.id}`}>
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div><div className="flex items-center gap-2 flex-wrap"><span className="font-mono text-[10px] text-[#8a938a]">ORDER / {order.id.slice(-7).toUpperCase()}</span><StatusPill status={order.status}/><span className="rounded-full bg-[#efeee6] px-2.5 py-1 font-mono text-[9px] text-[#778279]">{order.orderType.toLowerCase()}</span></div><h2 className="mt-3 font-serif font-extrabold text-xl tracking-[-.03em] text-[#20313a]">{isSeller ? `From ${order.buyerName}` : `From ${order.sellerName}`}</h2><p className="mt-1 text-xs text-[#8b948b]">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} · {order.deliveryAddress}</p></div><div className="text-left sm:text-right"><div className="font-serif font-extrabold text-[25px] tracking-[-.04em] text-[#347653]">{money(order.totalAmount)}</div><div className="text-[10px] text-[#8b948b]">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</div></div></div>
    <div className="mt-5 grid sm:grid-cols-[1fr_auto] gap-5 items-center"><div className="space-y-2">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-[#e7ebdf] overflow-hidden">{item.imageUrl && <img src={item.imageUrl} alt="" className="w-full h-full object-cover"/>}</div><span className="text-xs text-[#526358] font-semibold">{item.quantity} × {item.title}</span><span className="ml-auto text-xs text-[#829087]">{money(item.unitPrice * item.quantity)}</span></div>)}</div>
      <div className="flex flex-col sm:items-end gap-3">{order.status !== 'CANCELLED' && <div className="flex items-center gap-1">{flow.map((status, i) => <span key={status} className={`h-1.5 w-7 sm:w-9 rounded-full ${i <= stage ? 'bg-[#68a176]' : 'bg-[#e7e3d9]'}`} title={status}/>)}</div>}
        {isSeller && nextLabel[order.status] ? <button onClick={onAdvance} disabled={busy} className="rounded-full bg-[#20313a] text-white px-4 py-2.5 text-[10px] font-bold hover:bg-[#347653] transition-colors" data-testid={`button-update-order-${order.id}`}>{busy ? 'Updating…' : nextLabel[order.status]} <ChevronRight size={13} className="inline"/></button> : !isSeller && order.status === 'PENDING' ? <button onClick={onAdvance} disabled={busy} className="text-[10px] font-bold text-[#9b5546] hover:underline" data-testid={`button-cancel-order-${order.id}`}>Cancel request</button> : null}
      </div>
    </div>
  </article>;
}

function MessagesPage() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const client = useQueryClient();
  const threads = useGetMessageThreads({ query: { enabled: !!user, queryKey: getGetMessageThreadsQueryKey() } });
  const activeId = selectedId || threads.data?.[0]?.userId || '';
  const messages = useGetMessages(activeId, { query: { enabled: !!user && !!activeId, queryKey: getGetMessagesQueryKey(activeId) } });
  const sendMessage = useSendMessage();
  if (!user) return <AuthRequired go={() => setLocation('/login')}/>;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeId || !messageText.trim()) return;
    sendMessage.mutate({ data: { receiverId: activeId, content: messageText.trim(), ...(quoteAmount ? { quoteAmount: Number(quoteAmount) } : {}) } }, { onSuccess: () => { setMessageText(''); setQuoteAmount(''); void client.invalidateQueries({ queryKey: getGetMessagesQueryKey(activeId) }); void client.invalidateQueries({ queryKey: getGetMessageThreadsQueryKey() }); } });
  };
  const activeThread = threads.data?.find((thread) => thread.userId === activeId);
  return <main className="page-enter max-w-[1440px] mx-auto px-5 lg:px-10 py-9">
    <PageHeading eyebrow="People make the market" title="Notes from the field." subtitle="Talk through a harvest, a delivery or a fair price."/>
    {threads.isLoading ? <LoadingBlock label="Opening your conversations…"/> : threads.isError ? <ErrorBlock message="Conversations are not available right now." retry={() => void threads.refetch()}/> :
      <div className="min-h-[560px] max-h-[750px] grid md:grid-cols-[320px_1fr] rounded-[22px] overflow-hidden bg-[#fffdf7] border border-[#e3dfd3]">
        <aside className={`${activeId ? 'hidden md:flex' : 'flex'} flex-col border-r border-[#e5e0d4]`}>
          <div className="p-5 border-b border-[#e5e0d4]"><div className="font-mono uppercase tracking-[.16em] text-[9px] text-[#829085]">Your network</div><h2 className="font-serif text-xl font-extrabold text-[#20313a] mt-1">Conversations</h2></div>
          {!threads.data?.length ? <div className="m-auto p-6 text-center"><div className="w-12 h-12 mx-auto rounded-full bg-[#e7eee1] text-[#64856c] grid place-items-center"><MessageCircle size={20}/></div><p className="mt-3 text-sm font-bold text-[#536358]">A good conversation starts with a good question.</p><Link href="/" className="mt-3 inline-block text-xs font-bold text-[#347653] underline" data-testid="link-find-producers">Meet local producers</Link></div> :
            <div className="overflow-y-auto">{threads.data.map((thread) => <ThreadRow key={thread.userId} thread={thread} active={thread.userId === activeId} onClick={() => setSelectedId(thread.userId)}/>)}</div>}
        </aside>
        <section className={`${activeId ? 'flex' : 'hidden md:flex'} min-w-0 flex-col`}>
          {activeThread ? <><div className="p-4 sm:px-6 border-b border-[#e5e0d4] flex items-center gap-3"><button className="md:hidden p-1 text-[#758379]" onClick={() => setSelectedId('')} aria-label="Back to conversations" data-testid="button-back-to-threads"><ArrowLeft size={18}/></button><div className="w-10 h-10 rounded-full bg-[#dce9dc] text-[#347653] font-bold grid place-items-center">{activeThread.name.slice(0,1)}</div><div className="flex-1"><div className="font-bold text-sm text-[#20313a]">{activeThread.name}</div><div className="text-[10px] text-[#8a948b]">{activeThread.role.toLowerCase()}</div></div><span className="inline-flex items-center gap-1 text-[10px] text-[#728578]"><span className="w-1.5 h-1.5 rounded-full bg-[#70a776]"/> Direct line</span></div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f7f5ee]">
              {messages.isLoading ? <div className="space-y-3"><div className="h-14 w-2/3 bg-[#e7e3d9] rounded-2xl animate-pulse"/><div className="h-14 w-1/2 ml-auto bg-[#dce9dc] rounded-2xl animate-pulse"/></div> : messages.isError ? <ErrorBlock message="This conversation could not be opened." retry={() => void messages.refetch()}/> : !messages.data?.length ? <div className="h-full min-h-48 grid place-items-center text-center text-sm text-[#8a948b]">A fresh start. Send a note to open the conversation.</div> : messages.data.map((message) => <MessageBubble key={message.id} message={message} own={message.senderId === user.id}/>)}
            </div>
            <form onSubmit={submit} className="p-4 sm:p-5 border-t border-[#e5e0d4]">
              {sendMessage.isError && <p className="text-xs text-[#a04437] mb-2" role="alert" data-testid="error-send-message">Message did not send. Please try again.</p>}
              <div className="flex gap-2 mb-2"><input type="number" min="0" step=".01" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} className="field max-w-[160px] h-9 text-xs" placeholder="Add quote ($)" data-testid="input-quote-amount"/><span className="self-center text-[10px] text-[#929a90]">Optional price offer</span></div>
              <div className="flex gap-2 items-end"><textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement)?.requestSubmit(); } }} className="field min-h-[44px] max-h-28 resize-y" placeholder="Write a note…" data-testid="input-message-content"/><button type="submit" disabled={sendMessage.isPending || !messageText.trim()} className="w-11 h-11 shrink-0 rounded-xl bg-[#347653] text-white grid place-items-center hover:bg-[#286344] disabled:opacity-50" aria-label="Send message" data-testid="button-send-message"><Send size={17}/></button></div>
            </form>
          </> : <div className="m-auto max-w-sm text-center px-8"><div className="w-16 h-16 bg-[#e7eee1] text-[#64856c] rounded-full grid place-items-center mx-auto"><MessageCircle size={26}/></div><h2 className="mt-4 font-serif font-extrabold text-2xl text-[#20313a]">The best deals start with a hello.</h2><p className="text-sm text-[#7e8980] mt-2">Choose a conversation or find a producer in the market.</p><Link href="/" className="mt-5 inline-flex secondary-button" data-testid="link-open-market">Browse the market <ArrowRight size={14}/></Link></div>}
        </section>
      </div>}
  </main>;
}
function ThreadRow({ thread, active, onClick }: { thread: MessageThread; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`w-full p-4 text-left flex gap-3 border-b border-[#eee9df] transition-colors ${active ? 'bg-[#eaf0e5]' : 'hover:bg-[#f7f5ee]'}`} data-testid={`thread-${thread.userId}`}><span className="w-10 h-10 rounded-full bg-[#e2e6db] text-[#45664d] grid place-items-center font-bold text-sm shrink-0">{thread.name.slice(0,1)}</span><span className="flex-1 min-w-0"><span className="flex justify-between gap-2"><b className="text-xs text-[#344b3d] truncate">{thread.name}</b><time className="text-[9px] text-[#9aa096] shrink-0">{new Date(thread.timestamp).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time></span><span className="block text-[10px] text-[#899389] mt-1 truncate">{thread.lastMessage}</span></span>{thread.unread > 0 && <span className="w-5 h-5 rounded-full bg-[#edb74b] text-[#20313a] text-[9px] grid place-items-center font-bold">{thread.unread}</span>}</button>;
}
function MessageBubble({ message, own }: { message: { id: string; senderName: string; content: string; quoteAmount?: number | null; timestamp: string }; own: boolean }) {
  return <div className={`flex ${own ? 'justify-end' : 'justify-start'}`} data-testid={`message-${message.id}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${own ? 'bg-[#347653] text-white rounded-br-md' : 'bg-white border border-[#e5e0d4] text-[#34473b] rounded-bl-md'}`}><div className={`text-[9px] font-bold mb-1 ${own ? 'text-[#c3dcc5]' : 'text-[#7c8a7e]'}`}>{own ? 'You' : message.senderName}</div><p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>{message.quoteAmount != null && <div className={`mt-2 rounded-lg p-2 text-xs font-bold ${own ? 'bg-white/15 text-[#f5d585]' : 'bg-[#f5edda] text-[#8a6929]'}`}>Quote · {money(message.quoteAmount)}</div>}<time className={`block text-[9px] mt-2 text-right ${own ? 'text-[#b7d2bb]' : 'text-[#9aa096]'}`}>{new Date(message.timestamp).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})}</time></div></div>;
}

function AuthRequired({ go }: { go: () => void }) { return <main className="page-enter max-w-3xl mx-auto px-5 py-24 text-center"><div className="mx-auto w-16 h-16 rounded-full bg-[#dce9dc] text-[#347653] grid place-items-center"><UserRound size={27}/></div><h1 className="mt-5 font-serif font-extrabold tracking-[-.045em] text-[36px] text-[#20313a]">A quick sign-in, then you’re in.</h1><p className="mt-2 text-sm text-[#7c877e]">Sign in to see your SupplyLink activity and keep things moving.</p><button onClick={go} className="primary-button mt-6" data-testid="button-go-login">Sign in <ArrowRight size={15}/></button></main>; }
function EmptyState({ title, text, action }: { title: string; text: string; action: ReactNode }) { return <div className="rounded-[24px] border border-dashed border-[#c9c6b7] bg-[#f0ede4] py-14 px-5 text-center"><div className="mx-auto w-14 h-14 rounded-full bg-[#dce9dc] text-[#347653] grid place-items-center"><Sprout size={24}/></div><h3 className="mt-4 font-serif font-extrabold text-2xl text-[#20313a]">{title}</h3><p className="mt-2 text-sm text-[#7d887e]">{text}</p><div className="mt-5 flex justify-center">{action}</div></div>; }

export default App;
