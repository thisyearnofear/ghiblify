import os

def get_ghibli_image_workflow():
    """
    Returns the ComfyUI workflow for Ghibli Image-to-Image transformation.
    Optimized with VAEEncode for true i2i.
    """
    return {
        "nodes": [
            {
                "id": 1,
                "type": "LoadImage",
                "pos": [0, 0],
                "size": {"0": 315, "1": 58},
                "flags": {},
                "order": 0,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [1]}],
                "properties": {"Node name for S&R": "LoadImage"},
                "widgets_values": ["input_image.png", "image"]
            },
            {
                "id": 2,
                "type": "CLIPTextEncode",
                "pos": [400, 0],
                "size": {"0": 422, "1": 164},
                "flags": {},
                "order": 1,
                "mode": 0,
                "inputs": [{"name": "clip", "type": "CLIP", "link": 2}],
                "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [3]}],
                "properties": {"Node name for S&R": "CLIPTextEncode"},
                "widgets_values": ["ghibli style, Studio Ghibli art, anime style, high quality"]
            },
            {
                "id": 3,
                "type": "DualCLIPLoader",
                "pos": [900, 0],
                "size": {"0": 315, "1": 130},
                "flags": {},
                "order": 2,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "CLIP", "type": "CLIP", "links": [2, 9]}],
                "properties": {"Node name for S&R": "DualCLIPLoader"},
                "widgets_values": ["clip_l.safetensors", "t5xxl_fp8_e4m3fn.safetensors", "flux", "default"]
            },
            {
                "id": 4,
                "type": "UNETLoader",
                "pos": [1300, 0],
                "size": {"0": 315, "1": 82},
                "flags": {},
                "order": 3,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "MODEL", "type": "MODEL", "links": [4]}],
                "properties": {"Node name for S&R": "UNETLoader"},
                "widgets_values": ["flux1-dev-fp8.safetensors", "fp8_e4m3fn"]
            },
            {
                "id": 5,
                "type": "VAELoader",
                "pos": [1700, 0],
                "size": {"0": 315, "1": 58},
                "flags": {},
                "order": 4,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "VAE", "type": "VAE", "links": [10, 12]}],
                "properties": {"Node name for S&R": "VAELoader"},
                "widgets_values": ["ae.safetensors"]
            },
            {
                "id": 6,
                "type": "KSampler",
                "pos": [2100, 0],
                "size": {"0": 315, "1": 262},
                "flags": {},
                "order": 7,
                "mode": 0,
                "inputs": [
                    {"name": "model", "type": "MODEL", "link": 4},
                    {"name": "positive", "type": "CONDITIONING", "link": 3},
                    {"name": "negative", "type": "CONDITIONING", "link": 6},
                    {"name": "latent_image", "type": "LATENT", "link": 7}
                ],
                "outputs": [{"name": "LATENT", "type": "LATENT", "links": [8]}],
                "properties": {"Node name for S&R": "KSampler"},
                "widgets_values": [12345, "randomize", 20, 1, "euler", "simple", 0.6]
            },
            {
                "id": 7,
                "type": "CLIPTextEncode",
                "pos": [2500, 0],
                "size": {"0": 422, "1": 164},
                "flags": {},
                "order": 6,
                "mode": 0,
                "inputs": [{"name": "clip", "type": "CLIP", "link": 9}],
                "outputs": [{"name": "CONDITIONING", "type": "CONDITIONING", "links": [6]}],
                "properties": {"Node name for S&R": "CLIPTextEncode"},
                "widgets_values": ["blurry, low quality, distorted, watermark"]
            },
            {
                "id": 8,
                "type": "VAEEncode",
                "pos": [2900, 0],
                "size": {"0": 210, "1": 46},
                "flags": {},
                "order": 5,
                "mode": 0,
                "inputs": [
                    {"name": "pixels", "type": "IMAGE", "link": 1},
                    {"name": "vae", "type": "VAE", "link": 10}
                ],
                "outputs": [{"name": "LATENT", "type": "LATENT", "links": [7]}],
                "properties": {"Node name for S&R": "VAEEncode"},
                "widgets_values": []
            },
            {
                "id": 9,
                "type": "VAEDecode",
                "pos": [3300, 0],
                "size": {"0": 210, "1": 46},
                "flags": {},
                "order": 8,
                "mode": 0,
                "inputs": [
                    {"name": "samples", "type": "LATENT", "link": 8},
                    {"name": "vae", "type": "VAE", "link": 12}
                ],
                "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [11]}],
                "properties": {"Node name for S&R": "VAEDecode"},
                "widgets_values": []
            },
            {
                "id": 10,
                "type": "SaveImage",
                "pos": [3700, 0],
                "size": {"0": 722, "1": 426},
                "flags": {},
                "order": 9,
                "mode": 0,
                "inputs": [{"name": "images", "type": "IMAGE", "link": 11}],
                "outputs": [],
                "properties": {"Node name for S&R": "SaveImage"},
                "widgets_values": ["Ghiblify_Image"]
            }
        ],
        "links": [
            [1, 1, 0, 8, 0, "IMAGE"],
            [2, 3, 0, 2, 0, "CLIP"],
            [3, 2, 0, 6, 1, "CONDITIONING"],
            [4, 4, 0, 6, 0, "MODEL"],
            [6, 7, 0, 6, 2, "CONDITIONING"],
            [7, 8, 0, 6, 3, "LATENT"],
            [8, 6, 0, 9, 0, "LATENT"],
            [9, 3, 0, 7, 0, "CLIP"],
            [10, 5, 0, 8, 1, "VAE"],
            [11, 9, 0, 10, 0, "IMAGE"],
            [12, 5, 0, 9, 1, "VAE"]
        ],
        "version": 0.4
    }

def get_ghibli_video_workflow():
    """
    Returns the ComfyUI workflow for Ghibli Image-to-Video transformation.
    Optimized for ComfyOnline using SVD.
    """
    return {
        "nodes": [
            {
                "id": 1,
                "type": "LoadImage",
                "pos": [0, 0],
                "size": {"0": 315, "1": 58},
                "flags": {},
                "order": 0,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [1]}],
                "properties": {"Node name for S&R": "LoadImage"},
                "widgets_values": ["input_image.png", "image"]
            },
            {
                "id": 2,
                "type": "CheckpointLoaderSimple",
                "pos": [400, 0],
                "size": {"0": 315, "1": 82},
                "flags": {},
                "order": 1,
                "mode": 0,
                "inputs": [],
                "outputs": [
                    {"name": "MODEL", "type": "MODEL", "links": [3]},
                    {"name": "CLIP", "type": "CLIP", "links": []},
                    {"name": "VAE", "type": "VAE", "links": [4]}
                ],
                "properties": {"Node name for S&R": "CheckpointLoaderSimple"},
                "widgets_values": ["svd_xt.safetensors"]
            },
            {
                "id": 3,
                "type": "SVD_img2vid_Conditioning",
                "pos": [800, 0],
                "size": {"0": 315, "1": 182},
                "flags": {},
                "order": 2,
                "mode": 0,
                "inputs": [
                    {"name": "clip_vision", "type": "CLIP_VISION", "link": 5},
                    {"name": "init_image", "type": "IMAGE", "link": 1},
                    {"name": "vae", "type": "VAE", "link": 4}
                ],
                "outputs": [
                    {"name": "positive", "type": "CONDITIONING", "links": [6]},
                    {"name": "negative", "type": "CONDITIONING", "links": [7]},
                    {"name": "latent", "type": "LATENT", "links": [8]}
                ],
                "properties": {"Node name for S&R": "SVD_img2vid_Conditioning"},
                "widgets_values": [1024, 576, 25, 6, 1, 0.02]
            },
            {
                "id": 4,
                "type": "CLIPVisionLoader",
                "pos": [400, 200],
                "size": {"0": 315, "1": 58},
                "flags": {},
                "order": 3,
                "mode": 0,
                "inputs": [],
                "outputs": [{"name": "CLIP_VISION", "type": "CLIP_VISION", "links": [5]}],
                "properties": {"Node name for S&R": "CLIPVisionLoader"},
                "widgets_values": ["svd_clip_vision.safetensors"]
            },
            {
                "id": 5,
                "type": "KSampler",
                "pos": [1200, 0],
                "size": {"0": 315, "1": 262},
                "flags": {},
                "order": 4,
                "mode": 0,
                "inputs": [
                    {"name": "model", "type": "MODEL", "link": 3},
                    {"name": "positive", "type": "CONDITIONING", "link": 6},
                    {"name": "negative", "type": "CONDITIONING", "link": 7},
                    {"name": "latent_image", "type": "LATENT", "link": 8}
                ],
                "outputs": [{"name": "LATENT", "type": "LATENT", "links": [9]}],
                "properties": {"Node name for S&R": "KSampler"},
                "widgets_values": [12345, "randomize", 20, 2.5, "euler", "karras", 1]
            },
            {
                "id": 6,
                "type": "VAEDecode",
                "pos": [1600, 0],
                "size": {"0": 210, "1": 46},
                "flags": {},
                "order": 5,
                "mode": 0,
                "inputs": [
                    {"name": "samples", "type": "LATENT", "link": 9},
                    {"name": "vae", "type": "VAE", "link": 4}
                ],
                "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": [10]}],
                "properties": {"Node name for S&R": "VAEDecode"},
                "widgets_values": []
            },
            {
                "id": 7,
                "type": "VideoCombine",
                "pos": [1900, 0],
                "size": {"0": 315, "1": 122},
                "flags": {},
                "order": 6,
                "mode": 0,
                "inputs": [{"name": "images", "type": "IMAGE", "link": 10}],
                "outputs": [],
                "properties": {"Node name for S&R": "VideoCombine"},
                "widgets_values": {
                    "frame_rate": 24,
                    "loop_count": 0,
                    "filename_prefix": "Ghiblify_Motion",
                    "format": "video/h264-mp4",
                    "pix_fmt": "yuv420p",
                    "crf": 20,
                    "save_output": True
                }
            }
        ],
        "links": [
            [1, 1, 0, 3, 1, "IMAGE"],
            [3, 2, 0, 5, 0, "MODEL"],
            [4, 2, 2, 3, 2, "VAE"],
            [5, 4, 0, 3, 0, "CLIP_VISION"],
            [6, 3, 0, 5, 1, "CONDITIONING"],
            [7, 3, 1, 5, 2, "CONDITIONING"],
            [8, 3, 2, 5, 3, "LATENT"],
            [9, 5, 0, 6, 0, "LATENT"],
            [10, 6, 0, 7, 0, "IMAGE"]
        ],
        "version": 0.4
    }
