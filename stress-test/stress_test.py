#!/usr/bin/env python3
import argparse
import time
import random
import sys
from datetime import datetime, timedelta
import threading
from concurrent.futures import ThreadPoolExecutor
import requests
import statistics

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# Disable SSL warnings
requests.packages.urllib3.disable_warnings()

# Thread-local storage for HTTP sessions and user JWT tokens
thread_local = threading.local()

# Global statistics variables
stats_lock = threading.Lock()
metrics = {
    'total_requests': 0,
    'success_requests': 0,
    'failed_requests': 0,
    'latencies': [],
    'status_codes': {},
    'scenarios': {
        'login': {'success': 0, 'fail': 0},
        'search': {'success': 0, 'fail': 0},
        'detail': {'success': 0, 'fail': 0},
        'book': {'success': 0, 'fail': 0},
        'approve': {'success': 0, 'fail': 0},
        'pay': {'success': 0, 'fail': 0}
    }
}

# Shared authentication cache to prevent excessive login calls
token_cache = {
    'student': None,
    'landlord': None,
    'landlord2': None,
    'admin': None
}
token_lock = threading.Lock()

def get_session():
    """Get or create a thread-local requests session for connection pooling."""
    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()
    return thread_local.session

def record_metric(scenario, elapsed_ms, status_code, is_success):
    """Safely record stats across concurrent threads."""
    with stats_lock:
        metrics['total_requests'] += 1
        if is_success:
            metrics['success_requests'] += 1
            metrics['scenarios'][scenario]['success'] += 1
        else:
            metrics['failed_requests'] += 1
            metrics['scenarios'][scenario]['fail'] += 1
        
        metrics['latencies'].append(elapsed_ms)
        metrics['status_codes'][status_code] = metrics['status_codes'].get(status_code, 0) + 1

def api_login(base_url, email, password, role_name):
    """Authenticate and fetch JWT token."""
    session = get_session()
    url = f"{base_url}/api/v1/usuarios/auth/login"
    payload = {
        "correo": email,
        "password": password
    }
    
    start_time = time.perf_counter()
    try:
        response = session.post(url, json=payload, timeout=10, verify=False)
        elapsed = (time.perf_counter() - start_time) * 1000
        
        if response.status_code == 200:
            token = response.json().get('token')
            record_metric('login', elapsed, response.status_code, True)
            return token
        else:
            record_metric('login', elapsed, response.status_code, False)
            return None
    except Exception as e:
        elapsed = (time.perf_counter() - start_time) * 1000
        record_metric('login', elapsed, 'CONNECTION_ERROR', False)
        return None

def get_cached_token(base_url, user_type):
    """Retrieve token from cache, or login if not present. Holds lock during login to avoid race conditions."""
    global token_cache
    
    with token_lock:
        if token_cache[user_type] is not None:
            return token_cache[user_type]
        
        # Credentials from SeedDataInitializer
        creds = {
            'student': ('estudiante@gmail.com', 'Jhons2007@'),
            'landlord': ('arrendador@gmail.com', 'Jhons2007@'),
            'landlord2': ('arrendador2@gmail.com', 'Jhons2007@'),
            'admin': ('admin@gmail.com', 'Jhons2007@')
        }
        
        email, password = creds[user_type]
        token = api_login(base_url, email, password, user_type)
        
        if token:
            token_cache[user_type] = token
            
        return token

def task_search_properties(base_url):
    """Read-heavy: search properties with random parameters."""
    session = get_session()
    params = {
        'precioMin': random.randint(100, 300),
        'precioMax': random.randint(600, 1200),
        'disponible': 'true'
    }
    url = f"{base_url}/api/v1/propiedades/buscar"
    
    start_time = time.perf_counter()
    try:
        response = session.get(url, params=params, timeout=5, verify=False)
        elapsed = (time.perf_counter() - start_time) * 1000
        is_success = response.status_code == 200
        record_metric('search', elapsed, response.status_code, is_success)
        if is_success:
            return response.json()
    except Exception:
        elapsed = (time.perf_counter() - start_time) * 1000
        record_metric('search', elapsed, 'CONNECTION_ERROR', False)
    return None

def task_property_detail(base_url, token, property_id):
    """Read-heavy: view property complete details (requires auth)."""
    session = get_session()
    url = f"{base_url}/api/v1/propiedades/{property_id}/completo"
    headers = {"Authorization": f"Bearer {token}"}
    
    start_time = time.perf_counter()
    try:
        response = session.get(url, headers=headers, timeout=5, verify=False)
        elapsed = (time.perf_counter() - start_time) * 1000
        is_success = response.status_code == 200
        record_metric('detail', elapsed, response.status_code, is_success)
    except Exception:
        elapsed = (time.perf_counter() - start_time) * 1000
        record_metric('detail', elapsed, 'CONNECTION_ERROR', False)

def task_book_property(base_url, student_token, property_id):
    """Write-heavy: Create a reservation."""
    session = get_session()
    url = f"{base_url}/api/v1/reservas"
    headers = {"Authorization": f"Bearer {student_token}"}
    
    # Randomize check-in dates far in the future to prevent reservation collisions
    # (Checking against ESTADOS_BLOQUEANTES in ReservaService)
    days_offset = random.randint(30, 10000)
    fecha_inicio = datetime.now() + timedelta(days=days_offset)
    fecha_fin = fecha_inicio + timedelta(days=30)
    
    payload = {
        "propiedadId": property_id,
        "fechaInicio": fecha_inicio.strftime("%Y-%m-%d"),
        "fechaFin": fecha_fin.strftime("%Y-%m-%d")
    }
    
    start_time = time.perf_counter()
    try:
        response = session.post(url, json=payload, headers=headers, timeout=5, verify=False)
        elapsed = (time.perf_counter() - start_time) * 1000
        is_success = response.status_code in (200, 201)
        record_metric('book', elapsed, response.status_code, is_success)
        
        if is_success:
            res_data = response.json()
            return res_data.get('id')
    except Exception:
        elapsed = (time.perf_counter() - start_time) * 1000
        record_metric('book', elapsed, 'CONNECTION_ERROR', False)
    return None

def task_approve_reservation(base_url, landlord_token, reservation_id):
    """Write-heavy: Landlord approves reservation."""
    session = get_session()
    url = f"{base_url}/api/v1/reservas/{reservation_id}/aprobar"
    headers = {"Authorization": f"Bearer {landlord_token}"}
    
    start_time = time.perf_counter()
    try:
        response = session.patch(url, headers=headers, timeout=5, verify=False)
        elapsed = (time.perf_counter() - start_time) * 1000
        is_success = response.status_code == 200
        record_metric('approve', elapsed, response.status_code, is_success)
        return is_success
    except Exception:
        elapsed = (time.perf_counter() - start_time) * 1000
        record_metric('approve', elapsed, 'CONNECTION_ERROR', False)
    return False

def task_simulate_payment(base_url, admin_token, reservation_id):
    """Write-heavy: Admin simulates payment."""
    session = get_session()
    url = f"{base_url}/api/v1/pagos/simular-exito/{reservation_id}"
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    start_time = time.perf_counter()
    try:
        response = session.post(url, headers=headers, timeout=5, verify=False)
        elapsed = (time.perf_counter() - start_time) * 1000
        is_success = response.status_code == 200
        record_metric('pay', elapsed, response.status_code, is_success)
        return is_success
    except Exception:
        elapsed = (time.perf_counter() - start_time) * 1000
        record_metric('pay', elapsed, 'CONNECTION_ERROR', False)
    return False

def run_worker(base_url, scenario, stop_event):
    """Worker thread target simulating user actions."""
    # Ensure tokens are cached initially
    student_token = get_cached_token(base_url, 'student')
    landlord_token = get_cached_token(base_url, 'landlord')
    landlord2_token = get_cached_token(base_url, 'landlord2')
    admin_token = get_cached_token(base_url, 'admin')
    
    # Default properties available in SeedPropiedadesInitializer
    default_properties = [1, 2, 3, 4, 5, 6]
    
    while not stop_event.is_set():
        if scenario == 'read':
            # READ HEAVY loop
            properties = task_search_properties(base_url)
            
            p_id = random.choice(default_properties)
            if properties and isinstance(properties, list) and len(properties) > 0:
                # Try to use a property returned in search
                selected = random.choice(properties)
                if isinstance(selected, dict) and 'id' in selected:
                    p_id = selected['id']
            
            if student_token:
                task_property_detail(base_url, student_token, p_id)
            time.sleep(random.uniform(0.5, 1.5))
            
        elif scenario == 'write':
            # WRITE HEAVY booking workflow loop
            if not student_token or not landlord_token or not landlord2_token or not admin_token:
                # If authentication failed, sleep and retry auth
                time.sleep(2)
                student_token = get_cached_token(base_url, 'student')
                landlord_token = get_cached_token(base_url, 'landlord')
                landlord2_token = get_cached_token(base_url, 'landlord2')
                admin_token = get_cached_token(base_url, 'admin')
                continue
                
            p_id = random.choice(default_properties)
            # 1. Book room
            res_id = task_book_property(base_url, student_token, p_id)
            if res_id:
                # 2. Landlord approves (Must match property owner)
                active_landlord = landlord_token if p_id in [1, 2, 3, 4] else landlord2_token
                time.sleep(random.uniform(0.1, 0.3))
                approved = task_approve_reservation(base_url, active_landlord, res_id)
                if approved:
                    # 3. Admin pays
                    time.sleep(random.uniform(0.1, 0.3))
                    task_simulate_payment(base_url, admin_token, res_id)
            
            time.sleep(random.uniform(1.0, 3.0))
            
        else: # scenario == 'all'
            # Mix both flows
            choice = random.random()
            if choice < 0.7:  # 70% read
                properties = task_search_properties(base_url)
                p_id = random.choice(default_properties)
                if properties and isinstance(properties, list) and len(properties) > 0:
                    selected = random.choice(properties)
                    if isinstance(selected, dict) and 'id' in selected:
                        p_id = selected['id']
                if student_token:
                    task_property_detail(base_url, student_token, p_id)
                time.sleep(random.uniform(0.2, 0.8))
            else:             # 30% write
                if student_token and landlord_token and landlord2_token and admin_token:
                    p_id = random.choice(default_properties)
                    res_id = task_book_property(base_url, student_token, p_id)
                    if res_id:
                        active_landlord = landlord_token if p_id in [1, 2, 3, 4] else landlord2_token
                        time.sleep(random.uniform(0.1, 0.2))
                        if task_approve_reservation(base_url, active_landlord, res_id):
                            time.sleep(random.uniform(0.1, 0.2))
                            task_simulate_payment(base_url, admin_token, res_id)
                time.sleep(random.uniform(1.0, 2.0))

def print_realtime_progress(stop_event):
    """Background printing of progress statistics."""
    start_time = time.time()
    while not stop_event.is_set():
        time.sleep(2)
        elapsed = time.time() - start_time
        with stats_lock:
            total = metrics['total_requests']
            success = metrics['success_requests']
            failed = metrics['failed_requests']
            rps = total / elapsed if elapsed > 0 else 0
            
            sys.stdout.write(
                f"\r{Colors.BLUE}[+] Corriendo... {elapsed:.1f}s | "
                f"Reqs: {total} | "
                f"Exitosos: {Colors.GREEN}{success}{Colors.BLUE} | "
                f"Fallos: {Colors.FAIL}{failed}{Colors.BLUE} | "
                f"RPS: {rps:.1f}{Colors.ENDC}"
            )
            sys.stdout.flush()

def generate_report(elapsed_time):
    """Calculate and display final performance report."""
    print(f"\n\n{Colors.BOLD}{Colors.HEADER}=== INFORME DE PRUEBA DE ESTRÉS / ALQUILAYA ==={Colors.ENDC}")
    print(f"Duración de la prueba: {elapsed_time:.2f} segundos")
    
    total = metrics['total_requests']
    success = metrics['success_requests']
    failed = metrics['failed_requests']
    
    print(f"Total peticiones:      {total}")
    print(f"Peticiones exitosas:   {Colors.GREEN}{success} ({(success/total*100):.1f}%){Colors.ENDC}" if total > 0 else "Total: 0")
    print(f"Peticiones fallidas:   {Colors.FAIL}{failed} ({(failed/total*100):.1f}%){Colors.ENDC}" if total > 0 else "Total: 0")
    print(f"RPS promedio:          {(total / elapsed_time):.2f}")
    
    # Latency Stats
    latencies = metrics['latencies']
    if latencies:
        avg_lat = statistics.mean(latencies)
        min_lat = min(latencies)
        max_lat = max(latencies)
        p95 = statistics.quantiles(latencies, n=20)[18]  # 95th percentile
        p99 = statistics.quantiles(latencies, n=100)[98] # 99th percentile
        
        print(f"\n{Colors.BOLD}Estadísticas de Latencia (ms):{Colors.ENDC}")
        print(f"  Mínima:   {min_lat:.2f} ms")
        print(f"  Promedio: {avg_lat:.2f} ms")
        print(f"  P95:      {p95:.2f} ms (95% de peticiones debajo de esto)")
        print(f"  P99:      {p99:.2f} ms (99% de peticiones debajo de esto)")
        print(f"  Máxima:   {max_lat:.2f} ms")
    else:
        print(f"\nNo se registraron latencias válidas.")
        
    # Status codes distribution
    print(f"\n{Colors.BOLD}Distribución de Códigos HTTP:{Colors.ENDC}")
    for code, count in sorted(metrics['status_codes'].items()):
        color = Colors.GREEN if str(code).startswith('2') else Colors.FAIL
        print(f"  HTTP {color}{code}{Colors.ENDC}: {count} peticiones")
        
    # Break down per endpoint
    print(f"\n{Colors.BOLD}Desglose por Escenario/Endpoint:{Colors.ENDC}")
    for name, counts in metrics['scenarios'].items():
        s_total = counts['success'] + counts['fail']
        if s_total > 0:
            success_pct = (counts['success'] / s_total) * 100
            print(f"  {name.upper():<10}: Exito={Colors.GREEN}{counts['success']}{Colors.ENDC}, "
                  f"Fallo={Colors.FAIL}{counts['fail']}{Colors.ENDC} ({success_pct:.1f}% éxito)")

def main():
    parser = argparse.ArgumentParser(description="Herramienta de Prueba de Estrés para AlquilaYa microservicios.")
    parser.add_argument("--url", default="http://localhost:8080", help="URL base del API Gateway (default: http://localhost:8080)")
    parser.add_argument("--users", type=int, default=5, help="Número de usuarios concurrentes (hilos) (default: 5)")
    parser.add_argument("--duration", type=int, default=15, help="Duración del test en segundos (default: 15)")
    parser.add_argument("--scenario", choices=['read', 'write', 'all'], default='all', 
                        help="Escenario a ejecutar. 'read'=búsqueda y detalles, 'write'=flujo reserva/pago, 'all'=mixto (default: all)")
    
    args = parser.parse_args()
    
    print(f"{Colors.BOLD}{Colors.BLUE}[*] Iniciando pruebas en AlquilaYa Gateway ({args.url}){Colors.ENDC}")
    print(f"[*] Hilos concurrentes: {args.users} | Duración: {args.duration}s | Escenario: {args.scenario}")
    print(f"[*] Obteniendo credenciales y tokens JWT de prueba...")
    
    # Try fetching initial tokens to verify backend connectivity
    st = get_cached_token(args.url, 'student')
    lt = get_cached_token(args.url, 'landlord')
    lt2 = get_cached_token(args.url, 'landlord2')
    at = get_cached_token(args.url, 'admin')
    
    if not st or not lt or not lt2 or not at:
        print(f"{Colors.WARNING}[!] Advertencia: No se pudieron obtener todos los tokens. "
              f"¿Los microservicios están levantados y con los datos cargados (Seed)?{Colors.ENDC}")
        print(f"[!] Procediendo con el test (algunas llamadas de escritura/auth fallarán)...")
    else:
        print(f"{Colors.GREEN}[+] Conexión establecida y tokens obtenidos exitosamente.{Colors.ENDC}")
        
    stop_event = threading.Event()
    
    # Start progress reporter
    progress_thread = threading.Thread(target=print_realtime_progress, args=(stop_event,), daemon=True)
    progress_thread.start()
    
    start_time = time.time()
    
    # Run user threads
    with ThreadPoolExecutor(max_workers=args.users) as executor:
        futures = [executor.submit(run_worker, args.url, args.scenario, stop_event) for _ in range(args.users)]
        
        try:
            # Wait for the duration
            time.sleep(args.duration)
        except KeyboardInterrupt:
            print(f"\n{Colors.WARNING}[!] Prueba cancelada por el usuario. Generando reporte parcial...{Colors.ENDC}")
        finally:
            stop_event.set()
            
    elapsed = time.time() - start_time
    
    # Generate statistics report
    generate_report(elapsed)

if __name__ == '__main__':
    main()
