import { api } from '@/utils/api';
import { Propiedad } from '@/types/propiedad';

export interface SystemHealth {
  status: 'UP' | 'DOWN' | 'WARN';
  services: {
    name: string;
    status: 'UP' | 'DOWN' | 'WARN';
    details?: any;
  }[];
}

export const adminService = {
  /**
   * Obtiene la salud general del sistema desde el Actuator del Gateway.
   * En una configuración real, el Gateway agrega la salud de los servicios externos.
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Usamos nuestro Proxy API local para evitar errores de CORS
      // Esta ruta llama internamente al Gateway (localhost:8080) desde el servidor de Next.js
      const res = await fetch('/api/admin/health');
      if (!res.ok) throw new Error('Health check failed');
      const data = await res.json();
      
      const components = data.components || {};
      const services = Object.keys(components).map(key => ({
        name: key.toUpperCase(),
        status: components[key].status === 'UP' ? 'UP' : 'DOWN' as any,
        details: components[key].details
      }));

      return {
        status: data.status === 'UP' ? 'UP' : 'DOWN',
        services: services.length > 0 ? services : [
          { name: 'API GATEWAY', status: data.status === 'UP' ? 'UP' : 'DOWN' }
        ]
      };
    } catch (error: any) {
      console.error('Error fetching system health:', error);
      
      // Diferenciar entre errores de conexión y errores de respuesta
      const isConnectionError = error instanceof TypeError || error.message?.includes('fetch');
      
      return { 
        status: 'DOWN', 
        services: [{ 
          name: 'CONECTIVIDAD', 
          status: 'DOWN',
          details: isConnectionError ? 'No se pudo alcanzar el Gateway API (8080). ¿Está encendido?' : 'Error de permisos o respuesta inválida.'
        }] 
      };
    }
  },

  /**
   * Obtiene la lista real de propiedades desde el microservicio correspondientes.
   */
  async getRealProperties(): Promise<Propiedad[]> {
    try {
      const response = await api.get('/propiedades');
      return response.data;
    } catch (error) {
      console.error('Error fetching real properties:', error);
      return [];
    }
  },

  /**
   * Obtiene las últimas líneas del archivo de log del sistema.
   */
  async getSystemLogs(): Promise<string> {
    try {
      const res = await fetch('/api/admin/logs');
      if (!res.ok) return '[SISTEMA] Error al conectar con el flujo de logs.';
      const data = await res.json();
      return data.logs || '';
    } catch (error) {
      console.error('Error fetching logs:', error);
      return '[SISTEMA] No se pudo recuperar el registro de actividad.';
    }
  },

  /**
   * Obtiene la lista de proveedores que han subido su DNI y esperan aprobación.
   */
  async getPendingProviders(): Promise<any[]> {
    try {
      const response = await api.get('/usuarios/proveedores/pendientes');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending providers:', error);
      return [];
    }
  },

  /**
   * Aprueba la cuenta de un arrendador.
   */
  async approveProvider(id: number): Promise<boolean> {
    try {
      await api.put(`/usuarios/${id}/aprobar`);
      return true;
    } catch (error) {
      console.error('Error approving provider:', error);
      return false;
    }
  },

  /**
   * Rechaza la cuenta de un arrendador enviando un motivo.
   */
  async rejectProvider(id: number, motivo: string): Promise<boolean> {
    try {
      await api.put(`/usuarios/${id}/rechazar`, { motivo });
      return true;
    } catch (error) {
      console.error('Error rejecting provider:', error);
      return false;
    }
  }
};
