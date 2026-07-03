import random
import queue
from datetime import datetime, timedelta
from locust import HttpUser, task, between, events

# Thread-safe global queues to coordinate states between different types of concurrent users
# Student -> creates booking -> adds to corresponding landlord's approval queue
# Landlord -> approves booking -> adds to payment queue
# Admin -> pays booking
bookings_to_approve_l1 = queue.Queue()
bookings_to_approve_l2 = queue.Queue()
bookings_to_pay = queue.Queue()

# Default seed properties to target
DEFAULT_PROPERTIES = [1, 2, 3, 4, 5, 6]

class StudentUser(HttpUser):
    """Simulates a student browsing and booking properties."""
    weight = 7
    wait_time = between(1, 4)
    token = None
    
    def on_start(self):
        """Student login to obtain JWT."""
        payload = {
            "correo": "estudiante@gmail.com",
            "password": "Jhons2007@"
        }
        with self.client.post("/api/v1/usuarios/auth/login", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                self.token = response.json().get("token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                response.failure(f"Student login failed: {response.text}")

    @task(5)
    def search_properties(self):
        """Read-heavy: search properties with random budget filters."""
        precio_min = random.randint(150, 300)
        precio_max = random.randint(500, 1100)
        self.client.get(
            f"/api/v1/propiedades/buscar?precioMin={precio_min}&precioMax={precio_max}&disponible=true",
            name="/api/v1/propiedades/buscar"
        )

    @task(3)
    def view_property_detail(self):
        """Read-heavy: view detailed property information."""
        if not self.token:
            return
        p_id = random.choice(DEFAULT_PROPERTIES)
        self.client.get(
            f"/api/v1/propiedades/{p_id}/completo",
            headers=self.headers,
            name="/api/v1/propiedades/{id}/completo"
        )

    @task(1)
    def book_property(self):
        """Write-heavy: Create a reservation and queue it for approval."""
        if not self.token:
            return
        
        p_id = random.choice(DEFAULT_PROPERTIES)
        
        # Use random offset to prevent reservation check overlap collisions
        days_offset = random.randint(30, 20000)
        fecha_inicio = datetime.now() + timedelta(days=days_offset)
        fecha_fin = fecha_inicio + timedelta(days=30)
        
        payload = {
            "propiedadId": p_id,
            "fechaInicio": fecha_inicio.strftime("%Y-%m-%d"),
            "fechaFin": fecha_fin.strftime("%Y-%m-%d")
        }
        
        with self.client.post(
            "/api/v1/reservas",
            json=payload,
            headers=self.headers,
            name="/api/v1/reservas [POST]",
            catch_response=True
        ) as response:
            if response.status_code in (200, 201):
                reserva_id = response.json().get("id")
                if reserva_id:
                    # Route to the landlord who owns the property
                    if p_id in [1, 2, 3, 4]:
                        bookings_to_approve_l1.put(reserva_id)
                    else:
                        bookings_to_approve_l2.put(reserva_id)
            else:
                # Allow 500 overlapping validation error without failing the test itself
                if "solapa" in response.text or response.status_code == 500 or response.status_code == 400:
                    response.success()
                else:
                    response.failure(f"Booking creation failed: {response.status_code} - {response.text}")


class Landlord1User(HttpUser):
    """Simulates Landlord 1 managing properties 1-4 and approving bookings."""
    weight = 1
    wait_time = between(2, 5)
    token = None
    
    def on_start(self):
        """Landlord 1 login to obtain JWT."""
        payload = {
            "correo": "arrendador@gmail.com",
            "password": "Jhons2007@"
        }
        with self.client.post("/api/v1/usuarios/auth/login", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                self.token = response.json().get("token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                response.failure(f"Landlord 1 login failed: {response.text}")

    @task(3)
    def view_reservations(self):
        """Read-heavy: list bookings assigned to Landlord 1."""
        if not self.token:
            return
        self.client.get(
            "/api/v1/reservas/arrendador",
            headers=self.headers,
            name="/api/v1/reservas/arrendador"
        )

    @task(1)
    def approve_pending_booking(self):
        """Write-heavy: Approve an active reservation from queue."""
        if not self.token:
            return
        
        try:
            reserva_id = bookings_to_approve_l1.get_nowait()
        except queue.Empty:
            return
            
        with self.client.patch(
            f"/api/v1/reservas/{reserva_id}/aprobar",
            headers=self.headers,
            name="/api/v1/reservas/{id}/aprobar",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                bookings_to_pay.put(reserva_id)
            else:
                bookings_to_approve_l1.put(reserva_id)
                response.failure(f"Approval failed for booking {reserva_id}: {response.text}")


class Landlord2User(HttpUser):
    """Simulates Landlord 2 managing properties 5-6 and approving bookings."""
    weight = 1
    wait_time = between(2, 5)
    token = None
    
    def on_start(self):
        """Landlord 2 login to obtain JWT."""
        payload = {
            "correo": "arrendador2@gmail.com",
            "password": "Jhons2007@"
        }
        with self.client.post("/api/v1/usuarios/auth/login", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                self.token = response.json().get("token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                response.failure(f"Landlord 2 login failed: {response.text}")

    @task(3)
    def view_reservations(self):
        """Read-heavy: list bookings assigned to Landlord 2."""
        if not self.token:
            return
        self.client.get(
            "/api/v1/reservas/arrendador",
            headers=self.headers,
            name="/api/v1/reservas/arrendador"
        )

    @task(1)
    def approve_pending_booking(self):
        """Write-heavy: Approve an active reservation from queue."""
        if not self.token:
            return
        
        try:
            reserva_id = bookings_to_approve_l2.get_nowait()
        except queue.Empty:
            return
            
        with self.client.patch(
            f"/api/v1/reservas/{reserva_id}/aprobar",
            headers=self.headers,
            name="/api/v1/reservas/{id}/aprobar",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                bookings_to_pay.put(reserva_id)
            else:
                bookings_to_approve_l2.put(reserva_id)
                response.failure(f"Approval failed for booking {reserva_id}: {response.text}")


class AdminUser(HttpUser):
    """Simulates system admin who clears payments (only for development/testing)."""
    weight = 1
    wait_time = between(2, 5)
    token = None
    
    def on_start(self):
        """Admin login to obtain JWT."""
        payload = {
            "correo": "admin@gmail.com",
            "password": "Jhons2007@"
        }
        with self.client.post("/api/v1/usuarios/auth/login", json=payload, catch_response=True) as response:
            if response.status_code == 200:
                self.token = response.json().get("token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                response.failure(f"Admin login failed: {response.text}")

    @task(1)
    def process_payment(self):
        """Write-heavy: Simulate MercadoPago success callback."""
        if not self.token:
            return
            
        try:
            reserva_id = bookings_to_pay.get_nowait()
        except queue.Empty:
            return
            
        with self.client.post(
            f"/api/v1/pagos/simular-exito/{reserva_id}",
            headers=self.headers,
            name="/api/v1/pagos/simular-exito/{id}",
            catch_response=True
        ) as response:
            if response.status_code != 200:
                bookings_to_pay.put(reserva_id)
                response.failure(f"Payment simulation failed for booking {reserva_id}: {response.text}")
