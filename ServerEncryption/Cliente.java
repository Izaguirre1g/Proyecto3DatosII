//Código basado en pildorasinformaticas: https://www.youtube.com/playlist?list=PLU8oAlHdN5BktAXdEVCLUYzvDyqRQJ2lk
//Bibliotecas utilizadas

import javax.swing.*;
import java.awt.event.*;
import java.io.*;
import java.net.*;

public class Cliente {

    public static void main(String[] args) {
        MarcoCliente mimarco = new MarcoCliente();
        mimarco.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
    }
}
/**
 * Clase utilizada para montar la interfaz
 */
class MarcoCliente extends JFrame {

    private LaminaMarcoCliente milamina;

    public MarcoCliente() {
        setTitle("Chat");
        setBounds(600, 300, 280, 350);
        milamina = new LaminaMarcoCliente();
        add(milamina);
        setVisible(true);
    }
}
/**
 * Clase utilizada para guardar los datos de la interfaz
 */
class LaminaMarcoCliente extends JPanel implements Runnable {

    JTextField campo1, nick, ip;
    JTextField puerto;
    JTextArea campochat;
    JButton miboton, boton_registro_server;

    /**
     *Lo que realiza este método es generar la parte gráfica del programa
     */
    public LaminaMarcoCliente() {
       
        JLabel texto = new JLabel("Nombre:");
        add(texto);

        nick = new JTextField(5);
        add(nick);
        
        JLabel entrada_ip = new JLabel("IP:");
        add(entrada_ip);

        ip = new JTextField(8);
        add(ip);

        JLabel texto_puerto = new JLabel("Puerto:");
        add(texto_puerto);

        puerto = new JTextField(8);
        add(puerto);

        campochat = new JTextArea(12, 20);
        add(campochat);

        campo1 = new JTextField(20);
        add(campo1);

        miboton = new JButton("Enviar");
        miboton.addActionListener(new EnviaTexto(this));
        add(miboton);
        //Registra la existencia del cliente en el servidor
        boton_registro_server = new JButton("Registrar");
        boton_registro_server.addActionListener(new EnviaTexto(this));
        //boton_registro_server.addActionListener();
        add(boton_registro_server);
    }
    /**
     *Este método siempre escucha cuando se presiona el botón para crear el socket y para mostrar
     en el chat los mensajes recibidos
     */
    @Override
    public void run() {
        System.out.println("Se activa después");
        try {
            ServerSocket servidor_cliente = new ServerSocket(Integer.parseInt(puerto.getText()));
            Socket cliente;
            PaqueteEnvio paqueteRecibido;

            while (true) {
                cliente = servidor_cliente.accept();
                ObjectInputStream flujoentrada = new ObjectInputStream(cliente.getInputStream());
                paqueteRecibido = (PaqueteEnvio) flujoentrada.readObject();

                campochat.append("\n" + paqueteRecibido.getNick() + ": " + paqueteRecibido.getMensaje());
                
            }
        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
    }
}
/**
 * En esta clase lo que se hace es mostrar en la interfaz los mensajes del usuario
 * También es la encargada le decirle al cliente a dónde se encuentra el server(ip, port) y así mandarle los datos
 */
class EnviaTexto implements ActionListener {

    private LaminaMarcoCliente laminaCliente;

    public EnviaTexto(LaminaMarcoCliente laminaCliente) {
        this.laminaCliente = laminaCliente;
    }

    @Override
    public void actionPerformed(ActionEvent e) {
        String nickText = laminaCliente.nick.getText();
        String mensajeText = laminaCliente.campo1.getText();
        int puerto_envio = Integer.parseInt(laminaCliente.puerto.getText());
        //laminaCliente.campochat.append("\n" + nickText + ": " + mensajeText);

        try {
            Socket misocket = new Socket("127.0.0.1", 9999);
            PaqueteEnvio datos = new PaqueteEnvio();

            datos.setNick(nickText);
            datos.setIp(laminaCliente.ip.getText());
            datos.setMensaje(mensajeText);
            datos.setPuerto(puerto_envio);

            ObjectOutputStream paquete_datos = new ObjectOutputStream(misocket.getOutputStream());
            paquete_datos.writeObject(datos);
            misocket.close();
        } catch (UnknownHostException e1) {
            e1.printStackTrace();
        } catch (IOException e1) {
            System.out.println(e1.getMessage());
        }
        //Hilo en segundo plano para actualizar la pantalla de mensajes
        Thread mihilo = new Thread(laminaCliente);
        mihilo.start();
    }
}
/**
 * Esta clase es la encargada de codificar la información para enviarla o recibirla y luego 
 * mostrarla en pantalla
 * Son los Getters y Setters donde obtienen y dan la información
 */
class PaqueteEnvio implements Serializable {
    private String nick;
    private String ip;
    private String mensaje;
    public int puerto;

    public String getNick() {
        return nick;
    }

    public void setNick(String nick) {
        this.nick = nick;
    }

    public void setPuerto(int puerto) {
        this.puerto = puerto;
    }

    public int getPuerto() {
        return puerto;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getMensaje() {
        return mensaje;
    }

    public void setMensaje(String mensaje) {
        this.mensaje = mensaje;
    }
}

/* 
 Referencias
 https://www.w3schools.com/java/default.asp

*/